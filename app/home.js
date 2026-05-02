import { Nexus } from "@/constants/theme";
import { useAppPrefs } from "@/context/AppPrefs";
import { useMembership } from "@/context/MembershipContext";
import { FREE_LAUNCHES_PER_GAME, MEMBERSHIP_PRICE_GBP } from "@/lib/membership";
import { ensureAbVariant, logResearchEvent } from "@/lib/dissertation";
import { useFocusEffect, useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../constants/firebase";
import { PHASER_ARCADE_ROWS } from "./Arcade/arcadeCatalog";

const PHASER_ACCENT = {
  bg: "rgba(124, 58, 237, 0.08)",
  border: "rgba(0, 255, 136, 0.32)",
};

const PHASER_HOME_CARDS = PHASER_ARCADE_ROWS.map((g) => ({
  id: `arcade_${g.play}`,
  name: `${g.title} · HTML5`,
  icon: g.emoji,
  href: { pathname: "/Arcade/arcade", params: { play: g.play } },
  route: null,
  accent: { ...PHASER_ACCENT, iconBg: g.color },
}));

const GAMES = [
  {
    id: "puzzle",
    name: "PUZZLE LADDER · Flow / Pipe / Ice",
    icon: "🔗",
    href: { pathname: "/puzzle-ladder" },
    route: null,
    accent: {
      bg: "rgba(34,211,238,0.1)",
      border: "rgba(34,211,238,0.45)",
      iconBg: "#0e7490",
    },
  },
  {
    id: "puzzle-pipe",
    name: "PIPE PUZZLE (SOLO)",
    icon: "⊕",
    href: { pathname: "/puzzle/pipe" },
    route: null,
    accent: {
      bg: "rgba(3,105,161,0.12)",
      border: "rgba(56,189,248,0.45)",
      iconBg: "#0369a1",
    },
  },
  {
    id: "puzzle-ice",
    name: "ICE SLIDE (SOLO)",
    icon: "❄️",
    href: { pathname: "/puzzle/ice" },
    route: null,
    accent: {
      bg: "rgba(124,58,237,0.12)",
      border: "rgba(196,181,253,0.42)",
      iconBg: "#7c3aed",
    },
  },
  ...PHASER_HOME_CARDS,
  {
    id: "tictactoe",
    name: "TIC TAC TOE",
    icon: "⚔️",
    route: "/TicTacToe/tictactoe",
    accent: { bg: "rgba(0, 255, 136, 0.2)", border: "rgba(0, 255, 136, 0.45)", iconBg: "#00cc99" },
  },
  {
    id: "trivia",
    name: "TRIVIA",
    icon: "🧠",
    route: "/trivia/trivia",
    accent: { bg: "rgba(255, 0, 255, 0.12)", border: "rgba(255, 0, 255, 0.4)", iconBg: "#d946b8" },
  },
  {
    id: "snake",
    name: "SNAKE",
    icon: "🐍",
    route: "/Snake/snake",
    accent: { bg: "rgba(0, 212, 255, 0.12)", border: "rgba(0, 212, 255, 0.45)", iconBg: "#0099cc" },
  },
  {
    id: "social",
    name: "ARENA SOCIAL",
    icon: "🧑‍🚀",
    route: "/social",
    accent: {
      bg: "rgba(0,212,255,0.1)",
      border: "rgba(0,212,255,0.45)",
      iconBg: "#0891b2",
    },
  },
  {
    id: "online",
    name: "ONLINE TIC-TAC-TOE",
    icon: "🌐",
    route: "/multiplayer",
    accent: {
      bg: "rgba(56, 189, 248, 0.12)",
      border: "rgba(56, 189, 248, 0.5)",
      iconBg: "#0369a1",
    },
  },
  {
    id: "gemmatch",
    name: "GEM MATCH",
    icon: "💎",
    href: { pathname: "/Snake/snake", params: { play: "gem" } },
    route: null,
    accent: { bg: "rgba(236, 72, 153, 0.15)", border: "rgba(244, 114, 182, 0.55)", iconBg: "#be185d" },
  },
  {
    id: "runner",
    name: "ENDLESS RUNNER",
    icon: "🏃",
    route: "/EndlessRunner/endlessrunner",
    accent: { bg: "rgba(255, 170, 0, 0.15)", border: "rgba(255, 170, 0, 0.5)", iconBg: "#ff8800" },
  },
  {
    id: "rps",
    name: "ROCK PAPER SCISSORS",
    icon: "✊",
    route: "/RockPaperScissors/rockpaperscissors",
    accent: { bg: "rgba(255, 0, 85, 0.12)", border: "rgba(255, 0, 85, 0.4)", iconBg: "#ff3388" },
  },
];

export default function Home() {
  const router = useRouter();
  const { prefs, save, refresh } = useAppPrefs();
  const { isMember } = useMembership();
  const [displayName, setDisplayName] = useState("…");
  const [studyOpen, setStudyOpen] = useState(false);
  const [walkOpen, setWalkOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      if (auth.currentUser) void ensureAbVariant();
    }, [refresh])
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const d =
          user.displayName ||
          user.email?.split("@")[0] ||
          "Player";
        setDisplayName(d);
      } else {
        setDisplayName("Guest");
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      setStudyOpen(false);
      return;
    }
    if (prefs.analyticsConsent === null) setStudyOpen(true);
    else setStudyOpen(false);
  }, [prefs.analyticsConsent]);

  useEffect(() => {
    if (!auth.currentUser) {
      setWalkOpen(false);
      return;
    }
    if (prefs.analyticsConsent === null) return;
    if (!prefs.seenTutorial) setWalkOpen(true);
    else setWalkOpen(false);
  }, [prefs.analyticsConsent, prefs.seenTutorial]);

  const acceptStudy = async () => {
    await save({ analyticsConsent: true });
    await logResearchEvent("consent", { choice: true });
    setStudyOpen(false);
  };

  const declineStudy = async () => {
    await save({ analyticsConsent: false });
    setStudyOpen(false);
  };

  const dismissWalkthrough = async () => {
    await save({ seenTutorial: true });
    setWalkOpen(false);
  };

  const initial = displayName.charAt(0).toUpperCase() || "G";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/authentication/login");
    } catch (error) {
      Alert.alert("Logout Error", "Could not log out. Please try again.");
      console.error("Logout error:", error);
    }
  };

  const playGame = (g) => {
    if (g.href) {
      router.push(g.href);
    } else {
      router.push(g.route);
    }
  };

  const quickPlay = () => {
    const pick = GAMES[Math.floor(Math.random() * GAMES.length)];
    playGame(pick);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "left"]}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.glowG} />
        <View style={styles.glowM} />
        <View style={styles.glowC} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.arenaTitle, prefs.largeUI && styles.arenaTitleLG]}>PLAY HUB</Text>
              <Text style={[styles.welcome, prefs.largeUI && styles.welcomeLG]}>
                Welcome back,{" "}
                <Text style={styles.welcomeHighlight}>{displayName}</Text>
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push("/membership")}
                accessibilityLabel="Membership and plans"
              >
                <Text style={styles.tierBanner}>
                  {isMember()
                    ? "★ Play Hub Plus (demo) · tap details"
                    : `Free tier · ${FREE_LAUNCHES_PER_GAME} plays per title · ${MEMBERSHIP_PRICE_GBP}/mo after`}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity onPress={() => router.push("/settings")} accessibilityLabel="Settings">
                <Text style={styles.settingsGlyph}>⚙️</Text>
              </TouchableOpacity>
            <View
              style={[
                styles.avatar,
                Platform.select({
                  ios: {
                    shadowColor: Nexus.green,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                  },
                  android: { elevation: 8 },
                }),
              ]}
            >
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
            </View>
          </View>

          {GAMES.map((game) => (
            <Pressable
              key={game.id}
              style={({ pressed }) => [
                styles.card,
                prefs.largeUI && styles.cardLG,
                {
                  borderColor: game.accent.border,
                },
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => playGame(game)}
            >
              <View
                style={[
                  styles.iconWrap,
                  prefs.largeUI && styles.iconWrapLG,
                  { backgroundColor: game.accent.iconBg },
                ]}
              >
                <Text style={[styles.iconEmoji, prefs.largeUI && styles.iconEmojiLG]}>{game.icon}</Text>
              </View>
              <Text style={[styles.cardTitle, prefs.largeUI && styles.cardTitleLG]}>{game.name}</Text>
              <Text style={[styles.cardSub, prefs.largeUI && styles.cardSubLG]}>Choose your mode</Text>

              <View style={styles.modesRow}>
                <View style={styles.modeChip}>
                  <Text style={styles.modeIcon}>◉</Text>
                  <Text style={styles.modeText}>SOLO</Text>
                </View>
                <View style={styles.modeChip}>
                  <Text style={styles.modeIcon}>◎</Text>
                  <Text style={styles.modeText}>FRIEND</Text>
                </View>
                <View style={styles.modeChip}>
                  <Text style={styles.modeIcon}>🌐</Text>
                  <Text style={styles.modeText}>ONLINE</Text>
                </View>
              </View>
            </Pressable>
          ))}

          <View style={styles.quickRow}>
            <View style={styles.quickIconBox}>
              <Text style={styles.gamepad}>🎮</Text>
            </View>
            <View style={styles.quickTextCol}>
              <Text style={styles.quickTitle}>QUICK MATCH</Text>
              <Text style={styles.quickSub}>
                Jump into a random game
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.playNow,
                pressed && { opacity: 0.9 },
              ]}
              onPress={quickPlay}
            >
              <Text style={styles.playNowText}>PLAY</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogout}
          >
            <Text style={styles.outlineBtnText}>LOG OUT</Text>
          </Pressable>
        </ScrollView>

        <Modal visible={studyOpen} transparent animationType="fade">
          <View style={styles.modBackdrop}>
            <View style={styles.modCard}>
              <Text style={styles.modTitle}>Study participation</Text>
              <Text style={styles.modBody}>
                Optionally share anonymized taps and scores for research (see Settings anytime). Firebase stores events only if you allow.
              </Text>
              <TouchableOpacity style={styles.modPri} onPress={acceptStudy}>
                <Text style={styles.modPriT}>Allow analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modSec} onPress={declineStudy}>
                <Text style={styles.modSecT}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={walkOpen && !studyOpen} transparent animationType="fade">
          <View style={styles.modBackdrop}>
            <View style={styles.modCard}>
              <Text style={styles.modTitle}>Quick tour</Text>
              <Text style={styles.modBody}>
                Tap a card to play solo or hybrid modes. Arcade uses CDN Phaser (needs internet). Online TTT needs two signed-in phones and matching room codes from Firestore.
              </Text>
              <TouchableOpacity style={styles.modPri} onPress={dismissWalkthrough}>
                <Text style={styles.modPriT}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  root: { flex: 1, backgroundColor: Nexus.bg },
  glowG: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(0, 255, 136, 0.06)",
    top: -40,
    right: -80,
  },
  glowM: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 0, 255, 0.05)",
    bottom: 100,
    left: -70,
  },
  glowC: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0, 212, 255, 0.04)",
    top: "30%",
    left: -50,
  },
  scroll: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerTextWrap: { flex: 1, paddingRight: 12 },
  arenaTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: Nexus.green,
    textShadowColor: "rgba(0, 255, 136, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  welcome: { fontSize: 16, color: Nexus.textMuted, marginTop: 6 },
  tierBanner: {
    marginTop: 10,
    fontSize: 12,
    color: Nexus.cyan,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  welcomeHighlight: { color: Nexus.green, fontWeight: "700" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Nexus.green,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: "800",
    color: Nexus.darkText,
  },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingsGlyph: { fontSize: 22, paddingHorizontal: 4 },
  arenaTitleLG: { fontSize: 36 },
  welcomeLG: { fontSize: 18 },
  cardLG: { minHeight: 132, paddingVertical: 22 },
  iconWrapLG: { paddingVertical: 14, paddingHorizontal: 14 },
  iconEmojiLG: { fontSize: 42 },
  cardTitleLG: { fontSize: 23 },
  cardSubLG: { fontSize: 15 },
  modBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.55)",
    justifyContent: "center",
    padding: 24,
  },
  modCard: {
    backgroundColor: Nexus.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
  },
  modTitle: { fontSize: 20, fontWeight: "800", color: Nexus.green, marginBottom: 12 },
  modBody: { color: Nexus.textMuted, lineHeight: 21, marginBottom: 18 },
  modPri: {
    backgroundColor: Nexus.green,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  modPriT: { color: Nexus.darkText, fontWeight: "800" },
  modSec: { paddingVertical: 12, alignItems: "center" },
  modSecT: { color: Nexus.textMuted, fontWeight: "700" },
  card: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 2,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderColor: Nexus.borderDim,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  iconWrap: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconEmoji: { fontSize: 36 },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Nexus.text,
    marginBottom: 4,
  },
  cardSub: { fontSize: 14, color: Nexus.textMuted, marginBottom: 16 },
  modesRow: { flexDirection: "row", gap: 8 },
  modeChip: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 36, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.2)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  modeIcon: { fontSize: 10, color: Nexus.textMuted, marginBottom: 2 },
  modeText: { fontSize: 10, fontWeight: "700", color: Nexus.textMuted },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(19, 19, 26, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.2)",
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  quickIconBox: { marginRight: 12 },
  gamepad: { fontSize: 28 },
  quickTextCol: { flex: 1 },
  quickTitle: { fontSize: 16, fontWeight: "800", color: Nexus.text },
  quickSub: { fontSize: 12, color: Nexus.textMuted, marginTop: 2 },
  playNow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Nexus.magenta,
    ...Platform.select({
      ios: {
        shadowColor: Nexus.magenta,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  playNowText: {
    fontWeight: "900",
    fontSize: 13,
    color: Nexus.text,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "rgba(255, 0, 85, 0.5)",
    borderRadius: 12,
    paddingVertical: 14,
  },
  outlineBtnText: {
    textAlign: "center",
    color: "#ff6b7a",
    fontWeight: "700",
    fontSize: 15,
  },
});
