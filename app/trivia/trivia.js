import Constants from "expo-constants";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import { getISOWeekKey } from "../../lib/weekKey";
import { db } from "../../constants/firebase";
import { softAcceptChallenge } from "@/lib/challenges";

const auth = getAuth();

const TRIVIA_QUIZ_LENGTH = 5;
const OPENAI_FETCH_TIMEOUT_MS = 60_000;

// #region agent log
const __DEBUG_INGEST =
  typeof fetch !== "undefined"
    ? (payload) =>
        fetch("http://127.0.0.1:7865/ingest/0ecd33e7-af68-46c6-bbe3-d95a5d8f6748", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "1c5831",
          },
          body: JSON.stringify({
            sessionId: "1c5831",
            timestamp: Date.now(),
            ...payload,
          }),
        }).catch(() => {})
    : () => {};
// #endregion

function promiseWithTimeout(promise, ms, label) {
  let t;
  const timeoutPromise = new Promise((_, rej) => {
    t = setTimeout(
      () => rej(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    );
  });
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    timeoutPromise,
  ]);
}

const normalizeQuestion = (raw) => {
  const question = String(raw?.question ?? "").trim();
  const options = Array.isArray(raw?.options)
    ? raw.options.map((o) => String(o).trim())
    : [];
  const answer = String(raw?.answer ?? "").trim();
  if (!question || options.length < 2 || !answer) return null;
  if (!options.includes(answer)) return null;
  return { question, options, answer };
};

function getOpenAIKey() {
  const extra = Constants.expoConfig?.extra;
  const raw =
    (typeof process.env.EXPO_PUBLIC_OPENAI_API_KEY === "string"
      ? process.env.EXPO_PUBLIC_OPENAI_API_KEY
      : "") ||
    (typeof extra?.openaiApiKey === "string" ? extra.openaiApiKey : "") ||
    (typeof process.env.EXPO_PUBLIC_OPENAI_KEY === "string"
      ? process.env.EXPO_PUBLIC_OPENAI_KEY
      : "");
  let k = String(raw || "").trim();
  if (/^bearer\s+/i.test(k)) k = k.replace(/^bearer\s+/i, "").trim();
  return k;
}

function getTriviaProxyUrl() {
  const extra = Constants.expoConfig?.extra;
  const u =
    (typeof process.env.EXPO_PUBLIC_TRIVIA_GENERATE_URL === "string"
      ? process.env.EXPO_PUBLIC_TRIVIA_GENERATE_URL
      : "") ||
    (typeof extra?.triviaGenerateUrl === "string" ? extra.triviaGenerateUrl : "");
  return String(u || "").trim();
}

function getOpenAIModel() {
  const extra = Constants.expoConfig?.extra;
  const m =
    process.env.EXPO_PUBLIC_OPENAI_MODEL ||
    (typeof extra?.openaiModel === "string" ? extra.openaiModel : "") ||
    "gpt-4o-mini";
  return String(m).trim() || "gpt-4o-mini";
}

function getOpenAIChatCompletionsUrl() {
  const extra = Constants.expoConfig?.extra;
  const raw =
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL ||
    (typeof extra?.openaiBaseUrl === "string" ? extra.openaiBaseUrl : "") ||
    "";
  let base = String(raw || "").trim().replace(/\/$/, "");
  if (!base) base = "https://api.openai.com/v1";
  return `${base}/chat/completions`;
}

/** Proxy works in web + native (no OpenAI CORS). Direct OpenAI only on iOS/Android. */
function canUseOpenAIDirect() {
  return !!(getOpenAIKey() && Platform.OS !== "web");
}

function hasTriviaAiBackend() {
  return !!getTriviaProxyUrl() || canUseOpenAIDirect();
}

function finalizeGeneratedQuestions(count, normalized) {
  if (normalized.length < count) {
    throw new Error("AI returned too few valid questions. Try again.");
  }
  return normalized.slice(0, count);
}

async function fetchQuestionsViaProxy(proxyUrl, difficulty, count) {
  const apiKey = getOpenAIKey();
  const res = await promiseWithTimeout(
    fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ difficulty, count }),
    }),
    OPENAI_FETCH_TIMEOUT_MS + 2500,
    "Trivia proxy"
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Trivia proxy ${res.status}: ${errText.slice(0, 200)}`);
  }
  const payload = await res.json();
  let rawList = Array.isArray(payload?.questions) ? payload.questions : [];
  if (
    rawList.length === 0 &&
    payload?.choices?.[0]?.message?.content &&
    typeof payload.choices[0].message.content === "string"
  ) {
    try {
      const parsed = JSON.parse(payload.choices[0].message.content);
      rawList = Array.isArray(parsed?.questions) ? parsed.questions : [];
    } catch {
      rawList = [];
    }
  }
  const normalized = rawList
    .map((q) => normalizeQuestion(q))
    .filter(Boolean)
    .slice(0, count);
  return finalizeGeneratedQuestions(count, normalized);
}

async function fetchQuestionsViaOpenAIDirect(difficulty, count) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error(
      "Missing OpenAI key. Set EXPO_PUBLIC_OPENAI_API_KEY, rebuild the app, then try again."
    );
  }
  if (Platform.OS === "web") {
    throw new Error(
      "This web build cannot call OpenAI from the browser (CORS). Deploy EXPO_PUBLIC_TRIVIA_GENERATE_URL to a small HTTPS endpoint that POSTs to OpenAI server-side, or use the iOS/Android app."
    );
  }

  const difficultyLabel =
    difficulty === "easy" ? "easy" : difficulty === "hard" ? "hard" : "medium";
  const model = getOpenAIModel();
  const url = getOpenAIChatCompletionsUrl();

  const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
  const deadlineTimer = setTimeout(() => {
    try {
      ac?.abort();
    } catch (_) {}
  }, OPENAI_FETCH_TIMEOUT_MS);

  let res;
  try {
    // #region agent log
    __DEBUG_INGEST({
      location: "trivia.js:openai:direct:start",
      message: "openai fetch start",
      hypothesisId: "H3-openai-hang",
      data: { difficulty, count, model: String(model).slice(0, 40) },
    });
    // #endregion
    res = await promiseWithTimeout(
      fetch(url, {
        method: "POST",
        ...(ac ? { signal: ac.signal } : {}),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a trivia author. Return only valid JSON with a key 'questions' (array). Each item must have: question (string), options (array of exactly 4 distinct strings), answer (string, must be identical to one of the options). No extra keys.",
            },
            {
              role: "user",
              content: `Create exactly ${count} ${difficultyLabel} general-knowledge multiple-choice questions. Vary topics. Be concise. JSON only.`,
            },
          ],
          temperature: 0.7,
        }),
      }),
      OPENAI_FETCH_TIMEOUT_MS + 2500,
      "OpenAI API"
    );
  } catch (err) {
    // #region agent log
    __DEBUG_INGEST({
      location: "trivia.js:openai:direct:error",
      message: "openai fetch error",
      hypothesisId: "H3-openai-hang",
      data: {
        name: err?.name,
        message: String(err?.message || err).slice(0, 200),
      },
    });
    // #endregion
    if (err?.name === "AbortError") {
      throw new Error(
        `OpenAI request timed out after ${OPENAI_FETCH_TIMEOUT_MS / 1000}s. Try again.`
      );
    }
    throw err;
  } finally {
    clearTimeout(deadlineTimer);
  }
  __DEBUG_INGEST({
    location: "trivia.js:openai:direct:done",
    message: "openai fetch complete",
    hypothesisId: "H3-openai-hang",
    data: { status: res?.status, ok: res?.ok },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No content from OpenAI");

  const parsed = JSON.parse(text);
  const rawList = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const normalized = rawList
    .map((q) => normalizeQuestion(q))
    .filter(Boolean)
    .slice(0, count);
  return finalizeGeneratedQuestions(count, normalized);
}

/** Proxy (any platform) or direct OpenAI (native only). */
async function generateQuestionBatch(difficulty, count) {
  const proxy = getTriviaProxyUrl();
  if (proxy) {
    return fetchQuestionsViaProxy(proxy, difficulty, count);
  }
  return fetchQuestionsViaOpenAIDirect(difficulty, count);
}

/** Trivia questions come only from AI (proxy on web, direct on native). */
async function buildQuizForDifficulty(difficulty) {
  const n = TRIVIA_QUIZ_LENGTH;
  const apiKey = getOpenAIKey();
  const proxy = getTriviaProxyUrl();
  const aiOk = hasTriviaAiBackend();
  // #region agent log
  __DEBUG_INGEST({
    location: "trivia.js:buildQuizForDifficulty",
    message: "branch",
    hypothesisId: "H2-branch",
    data: {
      hasOpenAIKey: !!apiKey,
      hasProxy: !!proxy,
      canDirectOpenAI: canUseOpenAIDirect(),
      aiOk,
      difficulty,
    },
  });
  // #endregion

  if (!aiOk) {
    throw new Error(
      "Trivia needs AI. Mobile: set EXPO_PUBLIC_OPENAI_API_KEY and rebuild. " +
        "Web: set EXPO_PUBLIC_TRIVIA_GENERATE_URL (HTTPS proxy) and redeploy."
    );
  }

  return generateQuestionBatch(difficulty, n);
}

function TriviaGameInner() {
  const router = useRouter();
  const search = useLocalSearchParams();
  const challengeId = Array.isArray(search.challengeId)
    ? search.challengeId[0]
    : search.challengeId;
  const challengeTarget = Array.isArray(search.challengeTarget)
    ? search.challengeTarget[0]
    : search.challengeTarget;
  const challengeBeatRef = useRef(false);

  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [started, setStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadError, setLoadError] = useState("");

  const currentQuestion = questions[questionIndex];

  const totalQuestions = useMemo(() => {
    return questions.length;
  }, [questions]);

  const getDifficultyLabel = () => {
    if (selectedDifficulty === "easy") return "Easy";
    if (selectedDifficulty === "medium") return "Medium";
    if (selectedDifficulty === "hard") return "Hard";
    return "";
  };

  const startQuiz = async () => {
    if (!selectedDifficulty) return;

    setLoadError("");
    setLoadingQuiz(true);
    // #region agent log
    __DEBUG_INGEST({
      location: "trivia.js:startQuiz",
      message: "start",
      hypothesisId: "H4-startQuiz",
      data: { difficulty: selectedDifficulty },
    });
    // #endregion
    try {
      const built = await buildQuizForDifficulty(selectedDifficulty);
      setQuestions(built);
      setStarted(true);
      setQuestionIndex(0);
      setScore(0);
      setSelectedAnswer("");
      setAnswered(false);
      setFinished(false);
      setScoreSaved(false);
      challengeBeatRef.current = false;
    } catch (e) {
      const msg = e?.message || "Could not load trivia.";
      // #region agent log
      __DEBUG_INGEST({
        location: "trivia.js:startQuiz:catch",
        message: String(msg).slice(0, 300),
        hypothesisId: "H4-startQuiz",
        data: { difficulty: selectedDifficulty },
      });
      // #endregion
      setLoadError(msg);
      Alert.alert("Trivia", msg);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const chooseAnswer = (option) => {
    if (answered) return;

    setSelectedAnswer(option);
    setAnswered(true);

    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((prev) => prev + 1);
      setSelectedAnswer("");
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const restartQuiz = () => {
    setStarted(false);
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer("");
    setAnswered(false);
    setFinished(false);
    setSelectedDifficulty("");
    setQuestions([]);
    setScoreSaved(false);
    setLoadError("");
  };

  const saveScoreToFirebase = async () => {
    try {
      const user = auth.currentUser;

      if (!user || scoreSaved) return;

      const playerName =
        user.displayName || user.email?.split("@")[0] || "Anonymous";

      await addDoc(collection(db, "scores"), {
        player: playerName,
        game: "trivia",
        score: score,
        difficulty: selectedDifficulty,
        totalQuestions: totalQuestions,
        createdAt: serverTimestamp(),
        userId: user.uid,
        weekKey: getISOWeekKey(),
      });

      setScoreSaved(true);
    } catch (error) {
      console.error("Error saving trivia score:", error);
    }
  };

  useEffect(() => {
    if (finished && !scoreSaved) {
      saveScoreToFirebase();
    }
  }, [finished, scoreSaved]);

  useEffect(() => {
    if (!finished || !scoreSaved || !challengeId || challengeBeatRef.current) return;
    const t = Number(challengeTarget);
    if (!Number.isFinite(t)) return;
    if (score < t) return;
    challengeBeatRef.current = true;
    (async () => {
      try {
        await softAcceptChallenge(String(challengeId));
        Alert.alert("Challenge", `Beat target (${Math.floor(t)}+ correct). Logged.`);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [finished, scoreSaved, challengeId, challengeTarget, score]);

  const getOptionStyle = (option) => {
    if (!answered) {
      return styles.optionButton;
    }

    if (option === currentQuestion.answer) {
      return [styles.optionButton, styles.correctOption];
    }

    if (option === selectedAnswer && option !== currentQuestion.answer) {
      return [styles.optionButton, styles.wrongOption];
    }

    return styles.optionButton;
  };

  const getOptionTextStyle = (option) => {
    if (!answered) {
      return styles.optionText;
    }

    if (option === currentQuestion.answer || option === selectedAnswer) {
      return [styles.optionText, styles.selectedOptionText];
    }

    return styles.optionText;
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Trivia Game</Text>
          <Text style={styles.subtitle}>
            Answer the questions and test your knowledge
          </Text>

          {!started && !finished ? (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Questions</Text>
                  <Text style={styles.infoValue}>{TRIVIA_QUIZ_LENGTH}</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Difficulty</Text>
                  <Text style={styles.infoValue}>
                    {selectedDifficulty ? getDifficultyLabel() : "None"}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Choose Difficulty</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.difficultyButton,
                    selectedDifficulty === "easy" && styles.easyActive,
                  ]}
                  onPress={() => {
                    setLoadError("");
                    setSelectedDifficulty("easy");
                  }}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      selectedDifficulty === "easy" && styles.activeButtonText,
                    ]}
                  >
                    Easy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.difficultyButton,
                    selectedDifficulty === "medium" && styles.mediumActive,
                  ]}
                  onPress={() => {
                    setLoadError("");
                    setSelectedDifficulty("medium");
                  }}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      selectedDifficulty === "medium" && styles.activeButtonText,
                    ]}
                  >
                    Medium
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.difficultyButton,
                    selectedDifficulty === "hard" && styles.hardActive,
                  ]}
                  onPress={() => {
                    setLoadError("");
                    setSelectedDifficulty("hard");
                  }}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      selectedDifficulty === "hard" && styles.activeButtonText,
                    ]}
                  >
                    Hard
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingQuiz ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.loadingText}>Preparing your quiz…</Text>
                </View>
              ) : null}

              {!!loadError && !loadingQuiz ? (
                <Text style={styles.loadErrorBanner}>{loadError}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.startButton,
                  (!selectedDifficulty || loadingQuiz) && styles.disabledButton,
                ]}
                onPress={startQuiz}
                disabled={!selectedDifficulty || loadingQuiz}
              >
                <Text style={styles.buttonText}>
                  {loadingQuiz ? "Loading…" : "Start Quiz"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaderboardButton}
                onPress={() => router.push("/Leaderboard/leaderboard?game=trivia")}
              >
                <Text style={styles.buttonText}>View Leaderboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push("/home")}
              >
                <Text style={styles.buttonText}>Back to Main Menu</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {started && !finished && currentQuestion ? (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Question</Text>
                  <Text style={styles.infoValue}>
                    {questionIndex + 1}/{questions.length}
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Score</Text>
                  <Text style={styles.infoValue}>{score}</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Level</Text>
                  <Text style={styles.infoValue}>{getDifficultyLabel()}</Text>
                </View>
              </View>

              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{currentQuestion.question}</Text>
              </View>

              <View style={styles.optionsBox}>
                {currentQuestion.options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={getOptionStyle(option)}
                    onPress={() => chooseAnswer(option)}
                  >
                    <Text style={getOptionTextStyle(option)}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {answered ? (
                <View style={styles.resultBox}>
                  <Text
                    style={[
                      styles.resultText,
                      selectedAnswer === currentQuestion.answer
                        ? styles.correctText
                        : styles.wrongText,
                    ]}
                  >
                    {selectedAnswer === currentQuestion.answer
                      ? "Correct answer!"
                      : `Wrong answer. Correct answer: ${currentQuestion.answer}`}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.nextButton, !answered && styles.disabledButton]}
                onPress={nextQuestion}
                disabled={!answered}
              >
                <Text style={styles.buttonText}>
                  {questionIndex + 1 === questions.length
                    ? "Finish Quiz"
                    : "Next Question"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaderboardButton}
                onPress={() => router.push("/Leaderboard/leaderboard?game=trivia")}
              >
                <Text style={styles.buttonText}>View Leaderboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push("/home")}
              >
                <Text style={styles.buttonText}>Back to Main Menu</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {finished ? (
            <>
              <View style={styles.finishBox}>
                <Text style={styles.finishTitle}>Quiz Finished</Text>
                <Text style={styles.finishSubtitle}>
                  Difficulty: {getDifficultyLabel()}
                </Text>
                <Text style={styles.finalScore}>
                  Your Score: {score}/{questions.length}
                </Text>

                <Text style={styles.feedbackText}>
                  {score === questions.length
                    ? "Excellent work!"
                    : score >= 3
                    ? "Good job!"
                    : "Keep practising and try again."}
                </Text>
              </View>

              <TouchableOpacity style={styles.startButton} onPress={restartQuiz}>
                <Text style={styles.buttonText}>Play Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaderboardButton}
                onPress={() => router.push("/Leaderboard/leaderboard?game=trivia")}
              >
                <Text style={styles.buttonText}>View Leaderboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push("/home")}
              >
                <Text style={styles.buttonText}>Back to Main Menu</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#eaf4ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },

  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  infoBox: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },

  infoLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  difficultyButton: {
    flex: 1,
    backgroundColor: "#f1f3f5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  easyActive: {
    backgroundColor: "#28a745",
  },

  mediumActive: {
    backgroundColor: "#f0ad4e",
  },

  hardActive: {
    backgroundColor: "#dc3545",
  },

  difficultyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  activeButtonText: {
    color: "#fff",
  },

  questionCard: {
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    minHeight: 100,
    justifyContent: "center",
  },

  questionText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
    lineHeight: 28,
  },

  optionsBox: {
    marginBottom: 14,
  },

  optionButton: {
    backgroundColor: "#f1f3f5",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  optionText: {
    fontSize: 16,
    color: "#222",
    textAlign: "center",
    fontWeight: "500",
  },

  correctOption: {
    backgroundColor: "#28a745",
  },

  wrongOption: {
    backgroundColor: "#dc3545",
  },

  selectedOptionText: {
    color: "#fff",
  },

  resultBox: {
    backgroundColor: "#f8f9fc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },

  resultText: {
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },

  correctText: {
    color: "#28a745",
  },

  wrongText: {
    color: "#dc3545",
  },

  finishBox: {
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    padding: 20,
    marginBottom: 18,
    alignItems: "center",
  },

  finishTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },

  finishSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 10,
  },

  finalScore: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 10,
  },

  feedbackText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },

  startButton: {
    width: "100%",
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  nextButton: {
    width: "100%",
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  leaderboardButton: {
    width: "100%",
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  backButton: {
    width: "100%",
    backgroundColor: "#6c757d",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  loadingBox: {
    alignItems: "center",
    marginBottom: 16,
  },

  loadingText: {
    marginTop: 8,
    color: "#666",
    fontSize: 15,
  },

  loadErrorBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff3cd",
    color: "#856404",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default function TriviaGame() {
  const gate = useConsumePlayEntitlement("trivia");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="trivia" />;
  if (!gate.ok) return null;
  return <TriviaGameInner />;
}