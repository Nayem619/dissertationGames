import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import { softAcceptChallenge } from "@/lib/challenges";
import { Nexus } from "@/constants/theme";
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
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../constants/firebase";
import { getISOWeekKey } from "../../lib/weekKey";

const auth = getAuth();

function buildRunnerLayout(screenWidth) {
  const fallback =
    Dimensions.get("window").width ||
    Dimensions.get("screen").width ||
    393;
  const raw =
    typeof screenWidth === "number" && screenWidth > 120
      ? screenWidth
      : fallback;

  /** Stage ~phone width with padding — large on tablet but capped */
  const GAME_WIDTH = Math.min(Math.max(raw - 32, 300), Math.min(580, raw - 20));
  const GAME_HEIGHT = Math.round(GAME_WIDTH * 0.64);
  const GROUND_Y = GAME_HEIGHT - Math.max(54, Math.round(GAME_WIDTH * 0.1));
  const PLAYER_SIZE = Math.max(34, Math.round(GAME_WIDTH * 0.092));
  const PLAYER_X = Math.round(GAME_WIDTH * 0.12);
  const OBSTACLE_WIDTH = Math.max(18, Math.round(GAME_WIDTH * 0.048));
  const OBSTACLE_HEIGHT = Math.max(28, Math.round(GAME_WIDTH * 0.074));
  const JUMP_HEIGHT = Math.round(GAME_WIDTH * 0.39);
  const OBSTACLE_SPEED = Math.max(4.2, GAME_WIDTH / 96);
  const COIN_SPEED = Math.max(3.2, GAME_WIDTH / 120);
  const COIN_SIZE = Math.max(26, Math.round(GAME_WIDTH * 0.07));
  return {
    GAME_WIDTH,
    GAME_HEIGHT,
    GROUND_Y,
    PLAYER_SIZE,
    PLAYER_X,
    OBSTACLE_WIDTH,
    OBSTACLE_HEIGHT,
    OBSTACLE_SPEED,
    COIN_SPEED,
    JUMP_HEIGHT,
    COIN_SIZE,
  };
}

const COIN_SPAWN_CHANCE = 0.75;
const WIN_POINTS = 8;

function EndlessRunnerInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** Pin layout for one session so physics + Animated.Value stay in sync */
  const L = useMemo(() => buildRunnerLayout(Dimensions.get("window").width), []);

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
  const [showLevelHelp, setShowLevelHelp] = useState(false);

  const groundedTop = L.GROUND_Y - L.PLAYER_SIZE;
  const playerY = useRef(new Animated.Value(groundedTop)).current;
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

    setTimeout(() => setMessage(""), 1400);
  };

  /** Back without leaving orphaned intervals */
  const goBack = () => {
    runningRef.current = false;
    setRunning(false);
    setPaused(false);
    if (router.canGoBack()) router.back();
    else router.replace("/home");
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

  const LRef = useRef(L);
  LRef.current = L;

  useEffect(() => {
    if (!running || paused) return;

    const interval = setInterval(() => {
      const { GAME_WIDTH } = LRef.current;
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
      const { GAME_WIDTH, GROUND_Y, PLAYER_SIZE } = LRef.current;
      const shouldSpawnCoin = Math.random() < COIN_SPAWN_CHANCE;

      if (shouldSpawnCoin) {
        const possibleHeights = [
          GROUND_Y - PLAYER_SIZE - 5,
          GROUND_Y - PLAYER_SIZE - 22,
          GROUND_Y - PLAYER_SIZE - 48,
          GROUND_Y - PLAYER_SIZE - 76,
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
      const py =
        typeof playerY.__getValue === "function"
          ? Number(playerY.__getValue())
          : Number(playerY._value ?? 0);
      const lx = LRef.current;

      setObstacles((prev) => {
        const moved = prev.map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - lx.OBSTACLE_SPEED,
        }));

        const visible = moved.filter(
          (obstacle) => obstacle.x + lx.OBSTACLE_WIDTH > 0
        );

        const collided = visible.some((obstacle) => {
          const hitX =
            lx.PLAYER_X + 8 < obstacle.x + lx.OBSTACLE_WIDTH - 8 &&
            lx.PLAYER_X + lx.PLAYER_SIZE - 8 > obstacle.x + 8;

          const obstacleTop = lx.GROUND_Y - lx.OBSTACLE_HEIGHT;

          const hitY =
            py + lx.PLAYER_SIZE - 8 > obstacleTop &&
            py + 10 < lx.GROUND_Y;

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
          x: coin.x - lx.COIN_SPEED,
        }));

        const visible = moved.filter((coin) => coin.x + lx.COIN_SIZE > 0);

        const remainingCoins = [];

        visible.forEach((coin) => {
          const hitX =
            lx.PLAYER_X - 8 < coin.x + lx.COIN_SIZE &&
            lx.PLAYER_X + lx.PLAYER_SIZE + 8 > coin.x;

          const hitY =
            py - 8 < coin.y + lx.COIN_SIZE &&
            py + lx.PLAYER_SIZE + 8 > coin.y;

          if (hitX && hitY) {
            setPoints((prevPoints) => {
              const newPoints = prevPoints + 1;
              const oldLevel = getLevelFromPoints(prevPoints);
              const newLevel = getLevelFromPoints(newPoints);

              if (newLevel !== oldLevel) {
                setLevel(newLevel);
                showMessage(`Level ${newLevel}`);
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
  }, [running, paused, points, level, playerY]);

  const jump = () => {
    if (jumpingRef.current || !running || paused) return;

    jumpingRef.current = true;
    const lx = LRef.current;
    const grounded = lx.GROUND_Y - lx.PLAYER_SIZE;

    Animated.sequence([
      Animated.timing(playerY, {
        toValue: grounded - lx.JUMP_HEIGHT,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(playerY, {
        toValue: grounded,
        duration: 320,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      jumpingRef.current = false;
    });
  };

  const startGame = () => {
    challengeLoggedRef.current = false;
    const lx = LRef.current;
    const grounded = lx.GROUND_Y - lx.PLAYER_SIZE;
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
    playerY.setValue(grounded);
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
    startGame();
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
    return undefined;
  }, [running, paused]);

  const statusLabel =
    !started ? "READY" : running ? (paused ? "PAUSED" : "RUNNING") : won ? "YOU WIN" : "GAME OVER";

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.hit}>
          <Ionicons name="chevron-back" size={34} color={Nexus.green} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Endless Runner</Text>
          <Text style={styles.topSub}>tap stage · jump spikes · collect coins</Text>
        </View>
        {started && (
          <View style={{ alignItems: "flex-end", minWidth: 84 }}>
            <Text style={[styles.miniStat, styles.mono]}>{score}</Text>
            <Text style={styles.miniLabel}>DIST</Text>
          </View>
        )}
      </View>

      <View style={[styles.stageWrap]}>
        <TouchableOpacity style={styles.gameArea} activeOpacity={1} onPress={jump}>
          <View
            style={[styles.stageInner, { width: L.GAME_WIDTH, height: L.GAME_HEIGHT }]}
          >
            <View style={[styles.sky, { height: L.GROUND_Y }]} />
            <View pointerEvents="none" style={[styles.gradientBand, styles.bandLow]} />
            <View pointerEvents="none" style={[styles.gradientBand, styles.bandMid]} />
            <View pointerEvents="none" style={[styles.sun]} />
            <View
              pointerEvents="none"
              style={[
                styles.ground,
                { top: L.GROUND_Y, height: L.GAME_HEIGHT - L.GROUND_Y },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.groundGrass,
                { top: L.GROUND_Y + 10, height: Math.max(6, L.PLAYER_SIZE * 0.2) },
              ]}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.player,
                {
                  top: playerY,
                  left: L.PLAYER_X,
                  width: L.PLAYER_SIZE,
                  height: L.PLAYER_SIZE,
                },
              ]}
            />

            {obstacles.map((obstacle) => (
              <View
                key={obstacle.id}
                pointerEvents="none"
                style={[
                  styles.obstacle,
                  {
                    left: obstacle.x,
                    top: L.GROUND_Y - L.OBSTACLE_HEIGHT,
                    width: L.OBSTACLE_WIDTH,
                    height: L.OBSTACLE_HEIGHT,
                  },
                ]}
              />
            ))}

            {coins.map((coin) => (
              <View
                key={coin.id}
                pointerEvents="none"
                style={[
                  styles.coin,
                  {
                    left: coin.x,
                    top: coin.y,
                    width: L.COIN_SIZE,
                    height: L.COIN_SIZE,
                    borderRadius: L.COIN_SIZE / 2,
                  },
                ]}
              >
                <Text style={styles.coinText}>◆</Text>
              </View>
            ))}

            {!!message ? (
              <View style={styles.messageBox} pointerEvents="none">
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            {!started ? (
              <View style={styles.overlay} pointerEvents="none">
                <Text style={styles.overlayEyebrow}>READY</Text>
                <Text style={styles.overlayTitle}>Neon Sprint</Text>
                <Text style={styles.overlayText}>Tap below to PLAY</Text>
              </View>
            ) : null}

            {paused && running ? (
              <View style={styles.overlay} pointerEvents="none">
                <Text style={styles.overlayEyebrow}>PAUSED</Text>
                <Text style={styles.overlayTitle}>Frozen</Text>
                <Text style={styles.overlayText}>Resume when ready</Text>
              </View>
            ) : null}

            {!running && started && won ? (
              <View style={styles.overlay} pointerEvents="none">
                <Text style={styles.overlayEyebrow}>WIN</Text>
                <Text style={styles.overlayTitle}>You cleared Level 5</Text>
                <Text style={styles.overlayText}>{score} dist · {points} coins</Text>
              </View>
            ) : null}

            {!running && started && !won ? (
              <View style={styles.overlay} pointerEvents="none">
                <Text style={styles.overlayEyebrow}>OVER</Text>
                <Text style={styles.overlayTitle}>Impact</Text>
                <Text style={styles.overlayText}>{score} dist · {points} coins · Lvl {level}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={styles.statVal}>{score}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>COINS</Text>
            <Text style={styles.statVal}>{points}</Text>
          </View>
          <View style={[styles.statChip, styles.statChipAccent]}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={[styles.statVal, { color: Nexus.green }]}>{level}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>MODE</Text>
            <Text style={[styles.statVal, styles.monoXs]}>{statusLabel}</Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowLevelHelp((x) => !x)}
          style={styles.helpBar}
          activeOpacity={0.82}
        >
          <Text style={styles.helpBarT}>{showLevelHelp ? " Hide level ladder " : " How levels work "}</Text>
          <Ionicons name={showLevelHelp ? "chevron-up" : "chevron-down"} size={16} color={Nexus.green} />
        </TouchableOpacity>
        {showLevelHelp ? (
          <View style={styles.helpBox}>
            <Text style={styles.helpLine}>Lvl 2 at 2 coins · Lvl 5 at 8 · win condition = 8 coins</Text>
            <Text style={styles.helpLine}>Speed scales with obstacle spawn — dodge red blocks</Text>
          </View>
        ) : null}

        <View style={styles.buttonsRow}>
          {!started ? (
            <TouchableOpacity style={styles.btnPrimary} onPress={startGame}>
              <Text style={styles.btnPrimaryT}>Play</Text>
            </TouchableOpacity>
          ) : running ? (
            paused ? (
              <TouchableOpacity style={styles.btnWarn} onPress={resumeGame}>
                <Text style={styles.btnT}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnWarn} onPress={pauseGame}>
                <Text style={styles.btnT}>Pause</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={resetGame}>
              <Text style={styles.btnPrimaryT}>Again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnGhost} onPress={resetGame}>
            <Text style={styles.btnGhostT}>Restart</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row2}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() =>
              router.push("/Leaderboard/leaderboard?game=endlessrunner")
            }
          >
            <Ionicons name="trophy-outline" size={18} color="#0a1210" />
            <Text style={styles.btnSecondaryT}>Board</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondaryMuted} onPress={() => router.push("/home")}>
            <Text style={styles.btnSecondaryMutedT}>Play Hub</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tip}>
          {Platform.OS === "web"
            ? "Web: Space · Up ↑ — Mobile: tap the stage anywhere"
            : "Tap the stage anywhere to jump"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Nexus.bg,
  },
  mono: { fontVariant: ["tabular-nums"], color: Nexus.green },
  monoXs: { fontSize: 10, fontVariant: ["tabular-nums"] },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 6,
    backgroundColor: Nexus.bgElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Nexus.borderDim,
  },
  hit: { padding: 4 },
  topTitle: { color: Nexus.text, fontSize: 22, fontWeight: "900" },
  topSub: { color: Nexus.textMuted, marginTop: 4, fontSize: 13 },
  miniStat: { fontWeight: "900", fontSize: 18 },
  miniLabel: { color: Nexus.textMuted, fontSize: 10, marginTop: 2 },
  stageWrap: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 8,
    minHeight: 220,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  stageInner: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nexus.border,
    overflow: "hidden",
    alignSelf: "center",
    position: "relative",
    elevation: Platform.OS === "android" ? 6 : undefined,
    shadowColor: Nexus.green,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    backgroundColor: "#150c24",
  },
  gameArea: {
    justifyContent: "center",
    alignItems: "center",
  },
  sky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1b1040",
  },
  gradientBand: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0.42,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  bandLow: {
    top: "42%",
    height: "42%",
    backgroundColor: "#2d1466",
    transform: [{ scaleX: 1.06 }],
  },
  bandMid: {
    top: "12%",
    height: "38%",
    backgroundColor: "#3b1fa3",
    transform: [{ scaleX: 1.04 }],
    opacity: 0.35,
  },
  sun: {
    position: "absolute",
    top: 34,
    right: "10%",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255, 230, 120, 0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,210,0.45)",
    shadowColor: "#ffe066",
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  ground: {
    position: "absolute",
    width: "100%",
    backgroundColor: "#08231a",
    borderTopWidth: 4,
    borderTopColor: "#0bff9c66",
    paddingTop: 0,
  },
  groundGrass: {
    position: "absolute",
    left: "4%",
    right: "4%",
    backgroundColor: "rgba(17,212,146,0.22)",
    borderRadius: 4,
  },
  player: {
    position: "absolute",
    borderRadius: 10,
    backgroundColor: "#00ff8866",
    borderWidth: 2,
    borderColor: Nexus.green,
    shadowColor: Nexus.green,
    shadowOpacity: 0.65,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  obstacle: {
    position: "absolute",
    borderRadius: 6,
    backgroundColor: "#ff3b5cff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ffc4d244",
    shadowColor: "#ff3366",
    shadowOpacity: 0.85,
    shadowRadius: Platform.OS === "ios" ? 8 : undefined,
    elevation: Platform.OS === "android" ? 3 : undefined,
  },
  coin: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(250,215,92,1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,250,215,1)",
    shadowColor: "#ffd447",
    shadowOpacity: 0.9,
    shadowRadius: Platform.OS === "ios" ? 6 : undefined,
    elevation: Platform.OS === "android" ? 2 : undefined,
  },
  coinText: { fontWeight: "900", color: "#4a3700", fontSize: 12 },
  messageBox: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "rgba(12,22,38,0.72)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nexus.border,
  },
  messageText: { color: "#eafcfa", fontSize: 13, fontWeight: "700" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,10,18,0.42)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  overlayEyebrow: { color: Nexus.green, fontWeight: "900", fontSize: 12, letterSpacing: 4 },
  overlayTitle: {
    marginTop: 8,
    color: "#fdfcff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  overlayText: {
    marginTop: 12,
    color: Nexus.textMuted,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 20,
  },
  controls: {
    paddingHorizontal: 14,
    backgroundColor: Nexus.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Nexus.borderDim,
    gap: 10,
    paddingTop: 12,
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statChip: {
    flex: 1,
    minWidth: 72,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nexus.borderDim,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statChipAccent: { borderColor: Nexus.border },
  statLabel: { color: Nexus.textMuted, fontSize: 10, marginBottom: 4, fontWeight: "700" },
  statVal: { color: Nexus.text, fontSize: 18, fontWeight: "900" },
  helpBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nexus.borderDim,
  },
  helpBarT: { color: Nexus.green, fontWeight: "700", fontSize: 13 },
  helpBox: {
    paddingHorizontal: 8,
    paddingBottom: 2,
    gap: 6,
    marginTop: -2,
  },
  helpLine: { color: Nexus.textMuted, fontSize: 12, lineHeight: 18 },
  buttonsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  row2: { flexDirection: "row", gap: 10, marginTop: 4 },
  btnPrimary: {
    flex: 1,
    backgroundColor: Nexus.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnPrimaryT: { color: "#06130e", fontWeight: "900", fontSize: 16 },
  btnWarn: {
    flex: 1,
    backgroundColor: "#c98a1dff",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnT: { color: "#1a1405", fontWeight: "900", fontSize: 16 },
  btnGhost: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nexus.border,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: "transparent",
  },
  btnGhostT: { color: Nexus.green, fontWeight: "900", fontSize: 16 },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Nexus.green,
  },
  btnSecondaryT: { color: "#08160f", fontWeight: "800", fontSize: 15 },
  btnSecondaryMuted: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nexus.borderDim,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  btnSecondaryMutedT: { color: Nexus.textMuted, fontWeight: "800", fontSize: 15 },
  tip: {
    color: Nexus.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default function EndlessRunner() {
  const gate = useConsumePlayEntitlement("runner");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="runner" />;
  if (!gate.ok) return null;
  return <EndlessRunnerInner />;
}
