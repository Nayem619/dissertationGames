import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../constants/firebase";
import { softAcceptChallenge } from "@/lib/challenges";
import { getISOWeekKey } from "../../lib/weekKey";

const auth = getAuth();

const PLAYER_SIZE = 40;
const GAME_HEIGHT = 360;
const GAME_WIDTH = 480;
const GROUND_Y = 310;
const JUMP_HEIGHT = 170;
const OBSTACLE_WIDTH = 22;
const OBSTACLE_HEIGHT = 35;
const OBSTACLE_SPEED = 5;
const PLAYER_X = 60;

const COIN_SIZE = 30;
const COIN_SPEED = 4;
const COIN_SPAWN_CHANCE = 0.75;
const WIN_POINTS = 8;

function EndlessRunnerInner() {
  const router = useRouter();
  const sp = useLocalSearchParams();
  const challengeId = Array.isArray(sp.challengeId) ? sp.challengeId[0] : sp.challengeId;
  const challengeTarget = Array.isArray(sp.challengeTarget)
    ? sp.challengeTarget[0]
    : sp.challengeTarget;
  const challengeLoggedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [won, setWon] = useState(false);

  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);

  const [obstacles, setObstacles] = useState([]);
  const [coins, setCoins] = useState([]);
  const [message, setMessage] = useState("");

  const playerY = useRef(new Animated.Value(GROUND_Y - PLAYER_SIZE)).current;
  const jumpingRef = useRef(false);
  const savedRef = useRef(false);
  const scoreRef = useRef(0);
  const runningRef = useRef(false);

  const getLevelFromPoints = (currentPoints) => {
    if (currentPoints >= 8) return 5;
    if (currentPoints >= 6) return 4;
    if (currentPoints >= 4) return 3;
    if (currentPoints >= 2) return 2;
    return 1;
  };

  const showMessage = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 1200);
  };

  const saveScoreToFirebase = async (finalScore, finalPoints, finalLevel) => {
    try {
      const user = auth.currentUser;

      if (!user || finalScore <= 0) return;

      const playerName =
        user.displayName || user.email?.split("@")[0] || "Anonymous";

      await addDoc(collection(db, "scores"), {
        player: playerName,
        game: "endlessrunner",
        score: finalScore,
        points: finalPoints,
        level: finalLevel,
        createdAt: serverTimestamp(),
        userId: user.uid,
        weekKey: getISOWeekKey(),
      });

      const bestScoreRef = doc(
        db,
        "leaderboards",
        "endlessrunner",
        "players",
        user.uid
      );

      const bestScoreSnap = await getDoc(bestScoreRef);

      if (!bestScoreSnap.exists()) {
        await setDoc(bestScoreRef, {
          player: playerName,
          game: "endlessrunner",
          score: finalScore,
          points: finalPoints,
          level: finalLevel,
          userId: user.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        const oldData = bestScoreSnap.data();

        if (finalScore > (oldData.score || 0)) {
          await setDoc(
            bestScoreRef,
            {
              player: playerName,
              game: "endlessrunner",
              score: finalScore,
              points: finalPoints,
              level: finalLevel,
              userId: user.uid,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    } catch (error) {
      console.error("Error saving endless runner score:", error);
    }
  };

  const finishGame = async (didWin = false, finalPoints = points, finalLevel = level) => {
    if (!runningRef.current) return;

    runningRef.current = false;
    setRunning(false);
    setPaused(false);
    setWon(didWin);

    const finalScore = scoreRef.current;

    if (!savedRef.current && finalScore > 0) {
      savedRef.current = true;
      await saveScoreToFirebase(finalScore, finalPoints, finalLevel);
    }
    const tid = typeof challengeId === "string" ? challengeId.trim() : "";
    const tgt = Number(challengeTarget);
    if (
      tid &&
      Number.isFinite(tgt) &&
      finalScore >= tgt &&
      !challengeLoggedRef.current
    ) {
      challengeLoggedRef.current = true;
      void softAcceptChallenge(tid).then(() =>
        Alert.alert("Challenge", `Distance ${finalScore} ≥ ${Math.floor(tgt)} — logged.`)
      );
    }
  };

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    if (!running || paused) return;

    const interval = setInterval(() => {
      setObstacles((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          x: GAME_WIDTH,
        },
      ]);
    }, 1700);

    return () => clearInterval(interval);
  }, [running, paused]);

  useEffect(() => {
    if (!running || paused) return;

    const interval = setInterval(() => {
      const shouldSpawnCoin = Math.random() < COIN_SPAWN_CHANCE;

      if (shouldSpawnCoin) {
        const possibleHeights = [
          GROUND_Y - PLAYER_SIZE - 5,
          GROUND_Y - PLAYER_SIZE - 20,
          GROUND_Y - PLAYER_SIZE - 45,
          GROUND_Y - PLAYER_SIZE - 70,
        ];

        const randomHeight =
          possibleHeights[Math.floor(Math.random() * possibleHeights.length)];

        setCoins((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: GAME_WIDTH,
            y: randomHeight,
          },
        ]);
      }
    }, 1700);

    return () => clearInterval(interval);
  }, [running, paused]);

  useEffect(() => {
    if (!running || paused) return;

    const interval = setInterval(() => {
      const py = Number(playerY.__getValue());

      setObstacles((prev) => {
        const moved = prev.map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - OBSTACLE_SPEED,
        }));

        const visible = moved.filter(
          (obstacle) => obstacle.x + OBSTACLE_WIDTH > 0
        );

        const collided = visible.some((obstacle) => {
          const hitX =
            PLAYER_X + 8 < obstacle.x + OBSTACLE_WIDTH - 8 &&
            PLAYER_X + PLAYER_SIZE - 8 > obstacle.x + 8;

          const obstacleTop = GROUND_Y - OBSTACLE_HEIGHT;

          const hitY =
            py + PLAYER_SIZE - 8 > obstacleTop &&
            py + 10 < GROUND_Y;

          return hitX && hitY;
        });

        if (collided) {
          finishGame(false, points, level);
          return visible;
        }

        return visible;
      });

      setCoins((prev) => {
        const moved = prev.map((coin) => ({
          ...coin,
          x: coin.x - COIN_SPEED,
        }));

        const visible = moved.filter((coin) => coin.x + COIN_SIZE > 0);

        const remainingCoins = [];

        visible.forEach((coin) => {
          const hitX =
            PLAYER_X - 8 < coin.x + COIN_SIZE &&
            PLAYER_X + PLAYER_SIZE + 8 > coin.x;

          const hitY =
            py - 8 < coin.y + COIN_SIZE &&
            py + PLAYER_SIZE + 8 > coin.y;

          if (hitX && hitY) {
            setPoints((prevPoints) => {
              const newPoints = prevPoints + 1;
              const oldLevel = getLevelFromPoints(prevPoints);
              const newLevel = getLevelFromPoints(newPoints);

              if (newLevel !== oldLevel) {
                setLevel(newLevel);
                showMessage(`Level ${newLevel} reached`);
              } else {
                showMessage("+1 point");
              }

              if (newPoints >= WIN_POINTS) {
                setLevel(5);
                showMessage("You Win!");
                finishGame(true, newPoints, 5);
              }

              return newPoints;
            });
          } else {
            remainingCoins.push(coin);
          }
        });

        return remainingCoins;
      });

      setScore((prevScore) => prevScore + 1);
    }, 30);

    return () => clearInterval(interval);
  }, [running, paused, points, level]);

  const jump = () => {
    if (jumpingRef.current || !running || paused) return;

    jumpingRef.current = true;

    Animated.sequence([
      Animated.timing(playerY, {
        toValue: GROUND_Y - PLAYER_SIZE - JUMP_HEIGHT,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(playerY, {
        toValue: GROUND_Y - PLAYER_SIZE,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      jumpingRef.current = false;
    });
  };

  const startGame = () => {
    challengeLoggedRef.current = false;
    setStarted(true);
    setRunning(true);
    setPaused(false);
    setWon(false);
    setScore(0);
    setPoints(0);
    setLevel(1);
    setObstacles([]);
    setCoins([]);
    setMessage("");
    savedRef.current = false;
    scoreRef.current = 0;
    runningRef.current = true;
    playerY.setValue(GROUND_Y - PLAYER_SIZE);
    jumpingRef.current = false;
  };

  const pauseGame = () => {
    if (!started || !running) return;
    setPaused(true);
  };

  const resumeGame = () => {
    if (!started || !running) return;
    setPaused(false);
  };

  const resetGame = () => {
    setStarted(true);
    setRunning(true);
    setPaused(false);
    setWon(false);
    setScore(0);
    setPoints(0);
    setLevel(1);
    setObstacles([]);
    setCoins([]);
    setMessage("");
    savedRef.current = false;
    scoreRef.current = 0;
    runningRef.current = true;
    playerY.setValue(GROUND_Y - PLAYER_SIZE);
    jumpingRef.current = false;
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };

    if (Platform.OS === "web") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [running, paused]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Endless Runner</Text>
          <Text style={styles.subtitle}>
            Tap the game area or press Space to jump
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Score</Text>
              <Text style={styles.infoValue}>{score}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Points</Text>
              <Text style={styles.infoValue}>{points}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Level</Text>
              <Text style={styles.infoValue}>{level}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>
                {!started
                  ? "Ready"
                  : running
                  ? paused
                    ? "Paused"
                    : "Running"
                  : won
                  ? "You Win"
                  : "Game Over"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.gameArea}
            onPress={jump}
            activeOpacity={1}
          >
            <View style={styles.sky} />
            <View style={styles.sun} />
            <View style={[styles.ground, { top: GROUND_Y }]} />

            <Animated.View
              style={[
                styles.player,
                {
                  top: playerY,
                },
              ]}
            />

            {obstacles.map((obstacle) => (
              <View
                key={obstacle.id}
                style={[
                  styles.obstacle,
                  {
                    left: obstacle.x,
                    top: GROUND_Y - OBSTACLE_HEIGHT,
                  },
                ]}
              />
            ))}

            {coins.map((coin) => (
              <View
                key={coin.id}
                style={[
                  styles.coin,
                  {
                    left: coin.x,
                    top: coin.y,
                  },
                ]}
              >
                <Text style={styles.coinText}>P</Text>
              </View>
            ))}

            {message ? (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            {!started && (
              <View style={styles.overlay}>
                <Text style={styles.overlayTitle}>Ready to Play</Text>
                <Text style={styles.overlayText}>Press Play to begin</Text>
              </View>
            )}

            {paused && running && (
              <View style={styles.overlay}>
                <Text style={styles.overlayTitle}>Paused</Text>
                <Text style={styles.overlayText}>Press Resume to continue</Text>
              </View>
            )}

            {!running && started && won && (
              <View style={styles.overlay}>
                <Text style={styles.overlayTitle}>You Win!</Text>
                <Text style={styles.overlayText}>You completed level 5</Text>
                <Text style={styles.overlayText}>Final Score: {score}</Text>
                <Text style={styles.overlayText}>Points Collected: {points}</Text>
                <Text style={styles.overlayText}>Level Reached: {level}</Text>
              </View>
            )}

            {!running && started && !won && (
              <View style={styles.overlay}>
                <Text style={styles.overlayTitle}>Game Over</Text>
                <Text style={styles.overlayText}>Final Score: {score}</Text>
                <Text style={styles.overlayText}>Points Collected: {points}</Text>
                <Text style={styles.overlayText}>Level Reached: {level}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.levelInfoBox}>
            <Text style={styles.levelInfoTitle}>Level Targets</Text>
            <Text style={styles.levelInfoText}>Level 1 = 0 to 1 points</Text>
            <Text style={styles.levelInfoText}>Level 2 = 2 to 3 points</Text>
            <Text style={styles.levelInfoText}>Level 3 = 4 to 5 points</Text>
            <Text style={styles.levelInfoText}>Level 4 = 6 to 7 points</Text>
            <Text style={styles.levelInfoText}>Level 5 = 8+ points</Text>
          </View>

          <View style={styles.buttonColumn}>
            {!started ? (
              <TouchableOpacity style={styles.startButton} onPress={startGame}>
                <Text style={styles.buttonText}>Play</Text>
              </TouchableOpacity>
            ) : running ? (
              paused ? (
                <TouchableOpacity style={styles.pauseButton} onPress={resumeGame}>
                  <Text style={styles.buttonText}>Resume</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.pauseButton} onPress={pauseGame}>
                  <Text style={styles.buttonText}>Pause</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity style={styles.startButton} onPress={resetGame}>
                <Text style={styles.buttonText}>Play Again</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
              <Text style={styles.buttonText}>Restart Game</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leaderboardButton}
              onPress={() =>
                router.push("/Leaderboard/leaderboard?game=endlessrunner")
              }
            >
              <Text style={styles.buttonText}>View Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/home")}
            >
              <Text style={styles.buttonText}>Back to Main Menu</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tip}>
            Mobile: tap inside the game area to jump • Web: Space or Up Arrow
          </Text>
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
    alignItems: "center",
    elevation: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 18,
  },

  infoRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 18,
    flexWrap: "wrap",
  },

  infoBox: {
    flex: 1,
    minWidth: 90,
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    paddingVertical: 10,
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

  gameArea: {
    width: "100%",
    maxWidth: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#87ceeb",
    borderColor: "#333",
    borderWidth: 2,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
    marginBottom: 18,
  },

  sky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: GROUND_Y,
    backgroundColor: "#87ceeb",
  },

  sun: {
    position: "absolute",
    top: 25,
    right: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffd54f",
  },

  ground: {
    position: "absolute",
    width: "100%",
    height: GAME_HEIGHT - GROUND_Y,
    backgroundColor: "#8bc34a",
    borderTopWidth: 3,
    borderTopColor: "#5d4037",
  },

  player: {
    position: "absolute",
    left: PLAYER_X,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: "#4CAF50",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },

  obstacle: {
    position: "absolute",
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
    backgroundColor: "#E53935",
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },

  coin: {
    position: "absolute",
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    backgroundColor: "#ffd700",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff2a8",
  },

  coinText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#7a5a00",
  },

  messageBox: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },

  messageText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  overlayTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },

  overlayText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 4,
  },

  levelInfoBox: {
    width: "100%",
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  levelInfoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },

  levelInfoText: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginBottom: 2,
  },

  buttonColumn: {
    width: "100%",
  },

  startButton: {
    width: "100%",
    backgroundColor: "#007bff",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  pauseButton: {
    width: "100%",
    backgroundColor: "#f0ad4e",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  restartButton: {
    width: "100%",
    backgroundColor: "#6c757d",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  leaderboardButton: {
    width: "100%",
    backgroundColor: "#28a745",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  backButton: {
    width: "100%",
    backgroundColor: "#ff4d4f",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  tip: {
    color: "#666",
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
  },
});

export default function EndlessRunner() {
  const gate = useConsumePlayEntitlement("runner");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="runner" />;
  if (!gate.ok) return null;
  return <EndlessRunnerInner />;
}
