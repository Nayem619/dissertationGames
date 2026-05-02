import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import { getISOWeekKey } from "../../lib/weekKey";
import { db } from "../../constants/firebase";
import { softAcceptChallenge } from "@/lib/challenges";
import { Nexus } from "@/constants/theme";

const auth = getAuth();

/** Matches trivia card on Play Hub (`app/home.js`). */
const TRIVIA_ACCENT = {
  border: "rgba(255, 0, 255, 0.45)",
  soft: "rgba(255, 0, 255, 0.12)",
  iconBg: "#d946b8",
};

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
  const exitTrivia = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  };
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
      return [styles.optionButton, styles.optionIdle];
    }

    if (option === currentQuestion.answer) {
      return [styles.optionButton, styles.correctOption];
    }

    if (option === selectedAnswer && option !== currentQuestion.answer) {
      return [styles.optionButton, styles.wrongOption];
    }

    return [styles.optionButton, styles.optionFaded];
  };

  const getOptionTextStyle = (option) => {
    if (!answered) {
      return styles.optionText;
    }

    if (option === currentQuestion.answer || option === selectedAnswer) {
      return [styles.optionText, styles.optionTextOnAccent];
    }

    return [styles.optionText, styles.optionTextFaded];
  };

  const progressPct =
    started && questions.length > 0
      ? `${Math.round(((questionIndex + 1) / questions.length) * 100)}%`
      : "0%";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "left", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.glowG} />
        <View style={styles.glowM} />
        <View style={styles.glowPink} />

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBackHit}
            onPress={exitTrivia}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.topBackGlyph}>‹</Text>
            <Text style={styles.topBackLabel}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentFill}>
          <View style={styles.heroRow}>
            <View
              style={[
                styles.heroIconWrap,
                { backgroundColor: TRIVIA_ACCENT.iconBg },
              ]}
            >
              <Text style={styles.heroIcon}>🧠</Text>
            </View>
            <View style={styles.heroTitles}>
              <Text style={styles.title}>TRIVIA</Text>
              <Text style={styles.subtitle}>Arena Quiz</Text>
            </View>
          </View>
          {!started ? (
            <View style={styles.aiPill}>
              <Text style={styles.aiPillText}>✨ AI-generated · fresh each quiz</Text>
            </View>
          ) : null}
          {!started ? (
          <Text style={styles.introBody}>
            Pick a level and play five rounds. Questions are generated on demand—no stale bank.
          </Text>
          ) : null}

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
                  <ActivityIndicator size="large" color={Nexus.green} />
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
                <Text style={styles.leaderboardButtonText}>View Leaderboard</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {started && !finished && currentQuestion ? (
            <>
              <View style={styles.quizAiRow}>
                <View style={styles.aiBadgeSmall}>
                  <Text style={styles.aiBadgeSmallText}>✨ AI question</Text>
                </View>
                <Text style={styles.aiBadgeCaption}>Powered by AI — verify facts if unsure</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPct }]} />
              </View>

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
                <Text style={styles.leaderboardButtonText}>View Leaderboard</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {finished ? (
            <>
              <View style={styles.finishBox}>
                <Text style={styles.finishTitle}>Quiz Finished</Text>
                <View style={styles.aiPillMuted}>
                  <Text style={styles.aiPillMutedText}>✨ AI-generated quiz</Text>
                </View>
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
                <Text style={styles.leaderboardButtonText}>View Leaderboard</Text>
              </TouchableOpacity>
            </>
          ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Nexus.bg,
  },
  root: {
    flex: 1,
    backgroundColor: Nexus.bg,
  },
  glowG: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0, 255, 136, 0.07)",
    top: -30,
    right: -70,
  },
  glowM: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(0, 212, 255, 0.06)",
    bottom: 80,
    left: -60,
  },
  glowPink: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(217, 70, 184, 0.08)",
    top: "28%",
    left: -45,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Nexus.borderDim,
    backgroundColor: "rgba(10, 10, 15, 0.72)",
  },
  topBackHit: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  topBackGlyph: {
    fontSize: 28,
    fontWeight: "700",
    color: Nexus.cyan,
    marginRight: 2,
    marginTop: -2,
  },
  topBackLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: Nexus.text,
  },
  scrollFlex: {
    flex: 1,
    width: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    width: "100%",
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 8,
  },
  contentFill: {
    flexGrow: 1,
    width: "100%",
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroIcon: {
    fontSize: 28,
  },
  heroTitles: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1,
    color: Nexus.text,
    textShadowColor: TRIVIA_ACCENT.soft,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Nexus.magenta,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  aiPill: {
    alignSelf: "stretch",
    backgroundColor: TRIVIA_ACCENT.soft,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 255, 0.28)",
  },
  aiPillText: {
    color: Nexus.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  aiPillMuted: {
    alignSelf: "stretch",
    marginBottom: 10,
    alignItems: "center",
  },
  aiPillMutedText: {
    fontSize: 12,
    fontWeight: "700",
    color: Nexus.textMuted,
  },

  introBody: {
    fontSize: 14,
    color: Nexus.textMuted,
    lineHeight: 21,
    marginBottom: 16,
    textAlign: "center",
  },

  quizAiRow: {
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  aiBadgeSmall: {
    backgroundColor: TRIVIA_ACCENT.soft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 255, 0.35)",
  },
  aiBadgeSmallText: {
    fontSize: 12,
    fontWeight: "800",
    color: Nexus.text,
  },
  aiBadgeCaption: {
    fontSize: 11,
    color: Nexus.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },

  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(26, 26, 36, 0.95)",
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: Nexus.cyan,
  },

  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  infoBox: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 36, 0.92)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Nexus.borderDim,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Nexus.textMuted,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  infoValue: {
    fontSize: 17,
    fontWeight: "800",
    color: Nexus.text,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Nexus.text,
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
    backgroundColor: Nexus.bgElevated,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },

  easyActive: {
    backgroundColor: Nexus.green,
    borderColor: Nexus.green,
  },

  mediumActive: {
    backgroundColor: Nexus.cyan,
    borderColor: Nexus.cyan,
  },

  hardActive: {
    backgroundColor: Nexus.pink,
    borderColor: Nexus.pink,
  },

  difficultyText: {
    fontSize: 14,
    fontWeight: "800",
    color: Nexus.textMuted,
  },

  activeButtonText: {
    color: Nexus.darkText,
  },

  questionCard: {
    backgroundColor: "rgba(26, 26, 36, 0.92)",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    minHeight: 100,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.2)",
    ...Platform.select({
      ios: {
        shadowColor: Nexus.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      default: {},
    }),
  },

  questionText: {
    fontSize: 19,
    fontWeight: "700",
    color: Nexus.text,
    textAlign: "center",
    lineHeight: 27,
  },

  optionsBox: {
    marginBottom: 14,
  },

  optionButton: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  optionIdle: {
    backgroundColor: Nexus.bgElevated,
    borderColor: "rgba(217, 70, 184, 0.22)",
  },
  optionFaded: {
    backgroundColor: "rgba(15, 15, 20, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.04)",
    opacity: 0.55,
  },

  optionText: {
    fontSize: 16,
    color: Nexus.text,
    textAlign: "center",
    fontWeight: "600",
  },
  optionTextOnAccent: {
    color: Nexus.darkText,
  },
  optionTextFaded: {
    color: Nexus.textMuted,
  },

  correctOption: {
    backgroundColor: Nexus.green,
    borderColor: Nexus.green,
  },

  wrongOption: {
    backgroundColor: Nexus.pink,
    borderColor: Nexus.pink,
  },

  resultBox: {
    backgroundColor: "rgba(26, 26, 36, 0.95)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
  },

  resultText: {
    fontSize: 15,
    textAlign: "center",
    fontWeight: "700",
  },

  correctText: {
    color: Nexus.green,
  },

  wrongText: {
    color: "#ff6b7a",
  },

  finishBox: {
    backgroundColor: "rgba(26, 26, 36, 0.92)",
    borderRadius: 14,
    padding: 22,
    marginBottom: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: TRIVIA_ACCENT.border,
  },

  finishTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: Nexus.text,
    marginBottom: 8,
  },

  finishSubtitle: {
    fontSize: 14,
    color: Nexus.textMuted,
    marginBottom: 10,
    fontWeight: "600",
  },

  finalScore: {
    fontSize: 24,
    fontWeight: "900",
    color: Nexus.cyan,
    marginBottom: 10,
  },

  feedbackText: {
    fontSize: 16,
    color: Nexus.textMuted,
    textAlign: "center",
    lineHeight: 23,
    fontWeight: "600",
  },

  startButton: {
    width: "100%",
    backgroundColor: Nexus.green,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: Nexus.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },

  nextButton: {
    width: "100%",
    backgroundColor: Nexus.cyan,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },

  leaderboardButton: {
    width: "100%",
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Nexus.green,
  },

  disabledButton: {
    opacity: 0.45,
  },

  loadingBox: {
    alignItems: "center",
    marginBottom: 16,
  },

  loadingText: {
    marginTop: 8,
    color: Nexus.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  loadErrorBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 180, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 200, 80, 0.35)",
    color: "#ffd88a",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontWeight: "600",
  },

  buttonText: {
    color: Nexus.darkText,
    fontSize: 15,
    fontWeight: "800",
  },
  leaderboardButtonText: {
    color: Nexus.green,
    fontSize: 15,
    fontWeight: "800",
  },
});

export default function TriviaGame() {
  const gate = useConsumePlayEntitlement("trivia");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="trivia" />;
  if (!gate.ok) return null;
  return <TriviaGameInner />;
}