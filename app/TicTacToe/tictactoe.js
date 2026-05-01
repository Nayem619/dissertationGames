import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getISOWeekKey } from "../../lib/weekKey";
import { db } from "../../constants/firebase";

const auth = getAuth();

function TicTacToeInner() {
  const router = useRouter();
  const [mode, setMode] = useState(null);
  const [board, setBoard] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);
  const [player, setPlayer] = useState("X");
  const [winner, setWinner] = useState(null);
  const [score, setScore] = useState({ X: 0, O: 0 });

  const checkWinner = (currentBoard) => {
    const lines = [
      [[0, 0], [0, 1], [0, 2]],
      [[1, 0], [1, 1], [1, 2]],
      [[2, 0], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1]],
      [[0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 1], [2, 2]],
      [[0, 2], [1, 1], [2, 0]],
    ];

    for (let line of lines) {
      const [a, b, c] = line;
      const valA = currentBoard[a[0]][a[1]];
      const valB = currentBoard[b[0]][b[1]];
      const valC = currentBoard[c[0]][c[1]];

      if (valA && valA === valB && valA === valC) {
        return valA;
      }
    }

    return null;
  };

  const saveWinToFirebase = async (winningPlayer) => {
    try {
      const user = auth.currentUser;

      if (!user) {
        console.log("No logged-in user found. Score not saved.");
        return;
      }

      const playerName =
        user.displayName || user.email?.split("@")[0] || "Anonymous";

      const docRef = await addDoc(collection(db, "scores"), {
        player: playerName,
        game: "tictactoe",
        winner: winningPlayer,
        score: 1,
        createdAt: serverTimestamp(),
        userId: user.uid,
        weekKey: getISOWeekKey(),
      });

      console.log("Win saved to Firestore with ID:", docRef.id);
    } catch (err) {
      console.error("Error saving score:", err);
      Alert.alert("Save Error", "Score could not be saved to Firestore.");
    }
  };

  const handleWin = async (winningPlayer) => {
    setWinner(winningPlayer);
    setScore((prev) => ({
      ...prev,
      [winningPlayer]: prev[winningPlayer] + 1,
    }));

    await saveWinToFirebase(winningPlayer);
  };

  const handlePress = async (row, col) => {
    if (board[row][col] || winner) return;
    if (mode === "ai" && player === "O") return;

    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = player;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    const isDraw = newBoard.flat().every((cell) => cell !== null);

    if (result) {
      await handleWin(result);
      return;
    }

    if (isDraw) {
      setWinner("Draw");
      return;
    }

    setPlayer(player === "X" ? "O" : "X");
  };

  useEffect(() => {
    if (mode === "ai" && player === "O" && !winner) {
      const timeout = setTimeout(() => {
        makeAIMove();
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [board, player, mode, winner]);

  const makeAIMove = async () => {
    if (mode !== "ai" || winner) return;

    const currentBoard = board.map((r) => [...r]);
    const emptyCells = [];

    currentBoard.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (!cell) {
          emptyCells.push([i, j]);
        }
      });
    });

    if (emptyCells.length === 0) return;

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const [row, col] = emptyCells[randomIndex];

    currentBoard[row][col] = "O";
    setBoard(currentBoard);

    const result = checkWinner(currentBoard);
    const isDraw = currentBoard.flat().every((cell) => cell !== null);

    if (result) {
      await handleWin(result);
      return;
    }

    if (isDraw) {
      setWinner("Draw");
      return;
    }

    setPlayer("X");
  };

  const resetGame = () => {
    setBoard([
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]);
    setPlayer("X");
    setWinner(null);
  };

  const resetMode = () => {
    resetGame();
    setMode(null);
  };

  if (!mode) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Tic Tac Toe</Text>
          <Text style={styles.subtitle}>Choose a game mode</Text>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode("multiplayer")}
          >
            <Text style={styles.modeText}>Multiplayer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode("ai")}
          >
            <Text style={styles.modeText}>Play vs AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push("/Leaderboard/leaderboard?game=tictactoe")
            }
          >
            <Text style={styles.secondaryText}>View Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backMenuButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backMenuText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Tic Tac Toe</Text>
        <Text style={styles.subtitle}>
          {mode === "ai" ? "Play against the computer" : "Two player mode"}
        </Text>

        <View style={styles.playerInfoRow}>
          <View style={styles.playerBadge}>
            <Text style={styles.playerBadgeText}>
              {mode === "ai" ? "You: X" : "Player X"}
            </Text>
          </View>

          <View style={styles.playerBadge}>
            <Text style={styles.playerBadgeText}>
              {mode === "ai" ? "AI: O" : "Player O"}
            </Text>
          </View>
        </View>

        <View style={styles.statusBox}>
          {winner === "Draw" ? (
            <Text style={styles.drawText}>It is a draw</Text>
          ) : winner ? (
            <Text style={styles.winnerText}>Player {winner} wins</Text>
          ) : (
            <Text style={styles.turnText}>Current Turn: {player}</Text>
          )}
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>X Score</Text>
            <Text style={styles.scoreValue}>{score.X}</Text>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>O Score</Text>
            <Text style={styles.scoreValue}>{score.O}</Text>
          </View>
        </View>

        <Text style={styles.helperText}>Tap a square to place your mark</Text>

        <View style={styles.board}>
          {board.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((cell, j) => (
                <TouchableOpacity
                  key={j}
                  style={styles.cell}
                  onPress={() => handlePress(i, j)}
                >
                  <Text
                    style={[
                      styles.cellText,
                      cell === "X" && styles.xText,
                      cell === "O" && styles.oText,
                    ]}
                  >
                    {cell || ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={resetGame}>
          <Text style={styles.primaryButtonText}>Restart Game</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={resetMode}>
          <Text style={styles.dangerButtonText}>Back to Mode Select</Text>
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
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    elevation: 5,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 14,
    textAlign: "center",
  },

  playerInfoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  playerBadge: {
    backgroundColor: "#f1f5fb",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  playerBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334",
  },

  statusBox: {
    width: "100%",
    backgroundColor: "#f4f8ff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  turnText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },

  winnerText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "green",
  },

  drawText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#ff8800",
  },

  scoreRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12,
  },

  scoreCard: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },

  scoreLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  scoreValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },

  helperText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 12,
    textAlign: "center",
  },

  board: {
    marginBottom: 20,
    backgroundColor: "#dfe8f5",
    padding: 4,
    borderRadius: 10,
  },

  row: {
    flexDirection: "row",
  },

  cell: {
    width: 86,
    height: 86,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#2c3e50",
    justifyContent: "center",
    alignItems: "center",
  },

  cellText: {
    fontSize: 34,
    fontWeight: "bold",
  },

  xText: {
    color: "#007bff",
  },

  oText: {
    color: "#ff4d4f",
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#007bff",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  dangerButton: {
    width: "100%",
    backgroundColor: "#ff4d4f",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },

  dangerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  modeButton: {
    width: "100%",
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  modeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    width: "100%",
    backgroundColor: "#6c757d",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  backMenuButton: {
    width: "100%",
    backgroundColor: "#e0e0e0",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  backMenuText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default function TicTacToeScreen() {
  const gate = useConsumePlayEntitlement("tictactoe");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="tictactoe" />;
  if (!gate.ok) return null;
  return <TicTacToeInner />;
}