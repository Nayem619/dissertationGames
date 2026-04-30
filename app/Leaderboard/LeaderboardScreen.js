import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../constants/firebase";

export default function LeaderboardScreen() {
  const router = useRouter();
  const { game } = useLocalSearchParams();

  const [allScores, setAllScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("score");

  useEffect(() => {
    const fetchScores = async () => {
      try {
        setLoading(true);
        setError(null);

        // Endless Runner now reads from its own best-score leaderboard collection
        if (game === "endlessrunner") {
          const leaderboardQuery = query(
            collection(db, "leaderboards", "endlessrunner", "players"),
            orderBy("score", "desc")
          );

          const querySnapshot = await getDocs(leaderboardQuery);

          const leaderboardList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setAllScores(leaderboardList);
        } else {
          const querySnapshot = await getDocs(collection(db, "scores"));

          const scoresList = querySnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((item) => item.game === game);

          setAllScores(scoresList);
        }
      } catch (err) {
        console.error("Firestore error:", err);
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [game]);

  const scoreLeaderboard = useMemo(() => {
    // Endless Runner already comes in as one best row per player
    if (game === "endlessrunner") {
      return [...allScores].sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    const playerTotals = {};

    allScores.forEach((item) => {
      const playerName = item.player || "Unknown";

      if (!playerTotals[playerName]) {
        playerTotals[playerName] = {
          player: playerName,
          value: 0,
          difficulty: item.difficulty || "-",
        };
      }

      if (game === "tictactoe" && item.score === 1) {
        playerTotals[playerName].value += 1;
      }

      if (game === "rockpaperscissors" && item.score === 1) {
        playerTotals[playerName].value += 1;
      }

      if (game === "snake" && typeof item.score === "number") {
        if (item.score > playerTotals[playerName].value) {
          playerTotals[playerName].value = item.score;
          playerTotals[playerName].difficulty = item.difficulty || "-";
        }
      }

      if (game === "trivia" && typeof item.score === "number") {
        if (item.score > playerTotals[playerName].value) {
          playerTotals[playerName].value = item.score;
          playerTotals[playerName].difficulty = item.difficulty || "-";
        }
      }
    });

    return Object.values(playerTotals).sort((a, b) => b.value - a.value);
  }, [allScores, game]);

  const levelLeaderboard = useMemo(() => {
    const playerLevels = {};

    allScores.forEach((item) => {
      const playerName = item.player || "Unknown";

      const currentLevel =
        typeof item.highestLevel === "number"
          ? item.highestLevel
          : typeof item.level === "number"
          ? item.level
          : 0;

      if (!playerLevels[playerName]) {
        playerLevels[playerName] = {
          player: playerName,
          value: currentLevel,
          difficulty: item.difficulty || "-",
        };
      } else if (currentLevel > playerLevels[playerName].value) {
        playerLevels[playerName].value = currentLevel;
        playerLevels[playerName].difficulty = item.difficulty || "-";
      }
    });

    return Object.values(playerLevels).sort((a, b) => b.value - a.value);
  }, [allScores]);

  const leaderboardData =
    game === "snake" && viewMode === "level"
      ? levelLeaderboard
      : scoreLeaderboard;

  const getTitle = () => {
    if (game === "tictactoe") return "Tic Tac Toe Leaderboard";
    if (game === "rockpaperscissors") return "Rock Paper Scissors Leaderboard";
    if (game === "snake") return "Snake Leaderboard";
    if (game === "endlessrunner") return "Endless Runner Leaderboard";
    if (game === "trivia") return "Trivia Leaderboard";
    return "Leaderboard";
  };

  const getSubtitle = () => {
    if (game === "snake" && viewMode === "level") {
      return "Top players by highest level reached";
    }

    if (game === "tictactoe" || game === "rockpaperscissors") {
      return "Top players by total wins";
    }

    if (game === "trivia") {
      return "Top players by highest quiz score";
    }

    if (game === "endlessrunner") {
      return "Top players by highest endless runner score";
    }

    return "Top players for this game";
  };

  const renderItem = ({ item, index }) => {
    let rowStyle = styles.item;

    if (index === 0) rowStyle = [styles.item, styles.firstPlace];
    if (index === 1) rowStyle = [styles.item, styles.secondPlace];
    if (index === 2) rowStyle = [styles.item, styles.thirdPlace];

    return (
      <View style={rowStyle}>
        <View style={styles.leftSide}>
          <Text style={styles.rank}>#{index + 1}</Text>

          <View style={styles.playerInfo}>
            <Text style={styles.player}>{item.player}</Text>

            {(game === "snake" || game === "trivia") &&
            item.difficulty &&
            item.difficulty !== "-" ? (
              <Text style={styles.difficultyText}>
                Difficulty: {item.difficulty}
              </Text>
            ) : null}

            {game === "endlessrunner" && typeof item.level === "number" ? (
              <Text style={styles.difficultyText}>Level: {item.level}</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.score}>
          {game === "snake" && viewMode === "level"
            ? `Level ${item.value}`
            : game === "endlessrunner"
            ? `${item.score || 0} score`
            : `${item.value} score`}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>Loading leaderboard...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.errorText}>Error: {error}</Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/home")}
          >
            <Text style={styles.backButtonText}>Back to Main Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>

        {game === "snake" ? (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "score" && styles.activeToggleButton,
              ]}
              onPress={() => setViewMode("score")}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewMode === "score" && styles.activeToggleText,
                ]}
              >
                Score
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "level" && styles.activeToggleButton,
              ]}
              onPress={() => setViewMode("level")}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewMode === "level" && styles.activeToggleText,
                ]}
              >
                Highest Level
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {leaderboardData.length === 0 ? (
          <Text style={styles.emptyText}>No scores found</Text>
        ) : (
          <FlatList
            data={leaderboardData}
            keyExtractor={(item, index) =>
              item.id ? String(item.id) : item.player + index
            }
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/home")}
        >
          <Text style={styles.backButtonText}>Back to Main Menu</Text>
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
    maxWidth: 430,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#222",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },

  toggleRow: {
    flexDirection: "row",
    marginBottom: 18,
    gap: 10,
  },

  toggleButton: {
    flex: 1,
    backgroundColor: "#f1f3f5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  activeToggleButton: {
    backgroundColor: "#007bff",
  },

  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  activeToggleText: {
    color: "#fff",
  },

  list: {
    width: "100%",
    maxHeight: 400,
    marginBottom: 10,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fc",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  playerInfo: {
    flex: 1,
  },

  firstPlace: {
    backgroundColor: "#fff4cc",
  },

  secondPlace: {
    backgroundColor: "#f1f3f5",
  },

  thirdPlace: {
    backgroundColor: "#fce5cd",
  },

  rank: {
    width: 50,
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  player: {
    fontSize: 17,
    color: "#222",
    fontWeight: "600",
  },

  difficultyText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },

  score: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007bff",
  },

  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },

  errorText: {
    textAlign: "center",
    fontSize: 15,
    color: "red",
    marginBottom: 20,
  },

  backButton: {
    width: "100%",
    backgroundColor: "#007bff",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});