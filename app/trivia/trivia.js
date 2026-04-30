import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../constants/firebase";

const OPENAI_KEY =
  "";

const auth = getAuth(); 

const TRIVIA_COLLECTION = "trivia_questions";
const TRIVIA_QUIZ_LENGTH = 5;
/** ~0.5 uses Firestore when enough questions exist; otherwise OpenAI fills in. */
const FIREBASE_SOURCE_PROBABILITY = 0.5;

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

const shuffleArray = (array) => {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

function getOpenAIKey() {
  return OPENAI_KEY;
}

async function fetchFromFirebase(difficulty, count) {
  const ref = collection(db, TRIVIA_COLLECTION);
  const qy = query(ref, where("difficulty", "==", difficulty));
  const snap = await getDocs(qy);
  const list = snap.docs
    .map((d) => {
      const data = d.data();
      return normalizeQuestion({
        question: data.question,
        options: data.options,
        answer: data.answer,
      });
    })
    .filter(Boolean);
  return shuffleArray(list).slice(0, count);
}

async function saveQuestionToFirebase(difficulty, item) {
  const normalized = normalizeQuestion(item);
  if (!normalized) return;
  await addDoc(collection(db, TRIVIA_COLLECTION), {
    ...normalized,
    difficulty,
    createdAt: serverTimestamp(),
  });
}

async function generateWithOpenai(difficulty, count) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error(
      "Missing OpenAI key. Set OPENAI_KEY at the top of trivia.js."
    );
  }

  const difficultyLabel =
    difficulty === "easy" ? "easy" : difficulty === "hard" ? "hard" : "medium";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
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

  if (normalized.length < count) {
    throw new Error("OpenAI returned too few valid questions. Try again.");
  }

  for (const q of normalized) {
    await saveQuestionToFirebase(difficulty, q);
  }

  return normalized;
}

/** Mix Firestore and OpenAI so cache absorbs part of the traffic. */
async function buildQuizForDifficulty(difficulty) {
  const n = TRIVIA_QUIZ_LENGTH;
  const preferFirebase = Math.random() < FIREBASE_SOURCE_PROBABILITY;
  const apiKey = getOpenAIKey();

  if (preferFirebase) {
    const fromCache = await fetchFromFirebase(difficulty, n);
    if (fromCache.length >= n) {
      return shuffleArray(fromCache).slice(0, n);
    }
    const need = n - fromCache.length;
    if (!apiKey) {
      if (fromCache.length === 0) {
        throw new Error(
          "No trivia in Firebase and no OpenAI key. Set OPENAI_KEY at the top of trivia.js."
        );
      }
      return shuffleArray([...fromCache]).slice(0, fromCache.length);
    }
    const fresh = await generateWithOpenai(difficulty, need);
    return shuffleArray([...fromCache, ...fresh]).slice(0, n);
  }

  if (apiKey) {
    return await generateWithOpenai(difficulty, n);
  }

  const fromCache = await fetchFromFirebase(difficulty, n);
  if (fromCache.length < n) {
    throw new Error(
      "Not enough questions in Firebase and OpenAI key is missing. Set OPENAI_KEY in trivia.js or add questions to trivia_questions."
    );
  }
  return fromCache;
}

export default function TriviaGame() {
  const router = useRouter();

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

    setLoadingQuiz(true);
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
    } catch (e) {
      const msg = e?.message || "Could not load trivia.";
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
                  onPress={() => setSelectedDifficulty("easy")}
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
                  onPress={() => setSelectedDifficulty("medium")}
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
                  onPress={() => setSelectedDifficulty("hard")}
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

  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});