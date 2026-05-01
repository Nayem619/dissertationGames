import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getISOWeekKey } from "../../lib/weekKey";
import { db } from "../../constants/firebase";

const auth = getAuth();
const choices = ["Rock", "Paper", "Scissors"];

function RockPaperScissorsInner() {
  const router = useRouter();
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [result, setResult] = useState("");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({
    player: 0, 
    computer: 0,
    draws: 0,
  });

  const getWinner = (player, computer) => {
    if (player === computer) return "Draw";

    if (
      (player === "Rock" && computer === "Scissors") ||
      (player === "Paper" && computer === "Rock") ||
      (player === "Scissors" && computer === "Paper")
    ) {
      return "You Win";
    }

    return "Computer Wins";
  };

  const saveScoreToFirebase = async (player, computer, gameResult) => {
    try {
      const user = auth.currentUser;

      if (!user) {
        console.log("No logged in user, score not saved");
        return;
      }

      const playerName =
        user.displayName || user.email?.split("@")[0] || "Anonymous";

      const docRef = await addDoc(collection(db, "scores"), {
        player: playerName,
        game: "rockpaperscissors",
        playerChoice: player,
        computerChoice: computer,
        result: gameResult,
        score: gameResult === "You Win" ? 1 : 0,
        createdAt: serverTimestamp(),
        userId: user.uid,
        weekKey: getISOWeekKey(),
      });

      console.log("Rock Paper Scissors score saved with ID:", docRef.id);
    } catch (error) {
      console.error("Error saving score:", error);
      Alert.alert("Save Error", "Score could not be saved to Firestore.");
    }
  };

  const playGame = async (choice) => {
    const compChoice = choices[Math.floor(Math.random() * choices.length)];
    const gameResult = getWinner(choice, compChoice);

    setPlayerChoice(choice);
    setComputerChoice(compChoice);
    setResult(gameResult);

    if (gameResult === "You Win") {
      setScore((prev) => ({
        ...prev,
        player: prev.player + 1,
      }));
    } else if (gameResult === "Computer Wins") {
      setScore((prev) => ({
        ...prev,
        computer: prev.computer + 1,
      }));
    } else {
      setScore((prev) => ({
        ...prev,
        draws: prev.draws + 1,
      }));
    }

    setRound((prev) => prev + 1);

    await saveScoreToFirebase(choice, compChoice, gameResult);
  };

  const playAgain = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult("");
  };

  const resetScore = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult("");
    setRound(1);
    setScore({
      player: 0,
      computer: 0,
      draws: 0,
    });
  };

  const getResultStyle = () => {
    if (result === "You Win") return styles.winText;
    if (result === "Computer Wins") return styles.loseText;
    return styles.drawText;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Rock Paper Scissors</Text>
        <Text style={styles.subtitle}>Choose an option to play</Text>

        <View style={styles.roundBox}>
          <Text style={styles.roundText}>Round: {round}</Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>You</Text>
            <Text style={styles.scoreValue}>{score.player}</Text>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Computer</Text>
            <Text style={styles.scoreValue}>{score.computer}</Text>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Draws</Text>
            <Text style={styles.scoreValue}>{score.draws}</Text>
          </View>
        </View>

        <View style={styles.choices}>
          {choices.map((choice) => (
            <TouchableOpacity
              key={choice}
              style={styles.button}
              onPress={() => playGame(choice)}
            >
              <Text style={styles.buttonText}>{choice}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {playerChoice && (
          <View style={styles.resultBox}>
            <Text style={styles.infoText}>You chose: {playerChoice}</Text>
            <Text style={styles.infoText}>Computer chose: {computerChoice}</Text>
            <Text style={[styles.resultText, getResultStyle()]}>{result}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.restartButton} onPress={playAgain}>
          <Text style={styles.restartText}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={() =>
            router.push("/Leaderboard/leaderboard?game=rockpaperscissors")
          }
        >
          <Text style={styles.leaderboardText}>View Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetScore}>
          <Text style={styles.resetText}>Reset Score</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/home")}
        >
          <Text style={styles.backText}>Back to Main Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eaf4ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    elevation: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    color: "#222",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 18,
    textAlign: "center",
  },

  roundBox: {
    backgroundColor: "#f4f6fb",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 18,
  },

  roundText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  scoreRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },

  scoreCard: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },

  scoreLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  scoreValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },

  choices: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  button: {
    flex: 1,
    backgroundColor: "#007bff",
    paddingVertical: 14,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  resultBox: {
    width: "100%",
    backgroundColor: "#f4f6fb",
    padding: 15,
    borderRadius: 12,
    marginBottom: 18,
    alignItems: "center",
  },

  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: "#333",
  },

  resultText: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 8,
  },

  winText: {
    color: "green",
  },

  loseText: {
    color: "red",
  },

  drawText: {
    color: "#ff8800",
  },

  restartButton: {
    width: "100%",
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  restartText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  leaderboardButton: {
    width: "100%",
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  leaderboardText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  resetButton: {
    width: "100%",
    backgroundColor: "#5a6268",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  resetText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  backButton: {
    width: "100%",
    backgroundColor: "#ff4d4f",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  backText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});

export default function RockPaperScissorsScreen() {
  const gate = useConsumePlayEntitlement("rps");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="rps" />;
  if (!gate.ok) return null;
  return <RockPaperScissorsInner />;
}
