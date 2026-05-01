import { Nexus } from "@/constants/theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Landing() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "left", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.glowG} />
        <View style={styles.glowM} />
        <View style={styles.glowC} />

        <View style={styles.card}>
          <Text style={styles.brand} allowFontScaling={false}>
            NEXUS
          </Text>
          <Text style={styles.subBrand}>GAMING ARENA</Text>
          <Text style={styles.tagline}>
            Play fast, climb the board, and own the night.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.btnArena, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/home")}
          >
            <Text style={styles.btnArenaText}>ENTER NEXUS ARENA · GAMES</Text>
          </Pressable>
          <Text style={styles.guestHint}>No sign-in required for solo & arcade (web + app demos).</Text>

          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/authentication/login")}
          >
            <Text style={styles.btnPrimaryText}>LOG IN</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/authentication/signup")}
          >
            <Text style={styles.btnSecondaryText}>SIGN UP</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  root: {
    flex: 1,
    backgroundColor: Nexus.bg,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  glowG: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(0, 255, 136, 0.08)",
    top: -60,
    right: -80,
  },
  glowM: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 0, 255, 0.06)",
    bottom: 20,
    left: -70,
  },
  glowC: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0, 212, 255, 0.05)",
    top: "38%",
    left: -50,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Nexus.bgCard,
    borderWidth: 2,
    borderColor: Nexus.borderDim,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: Nexus.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  brand: {
    fontSize: 48,
    fontWeight: "900",
    color: Nexus.green,
    letterSpacing: 2,
    textAlign: "center",
    textShadowColor: "rgba(0, 255, 136, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subBrand: {
    fontSize: 16,
    color: Nexus.textMuted,
    marginTop: 4,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    color: Nexus.textMuted,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 12,
    lineHeight: 20,
  },
  btnArena: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(0, 212, 255, 0.55)",
    backgroundColor: "rgba(0, 212, 255, 0.12)",
    marginBottom: 10,
  },
  btnArenaText: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: 14,
    color: Nexus.cyan,
    letterSpacing: 0.5,
  },
  guestHint: {
    fontSize: 12,
    color: Nexus.textMuted,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  btnPrimary: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Nexus.green,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: Nexus.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  btnPrimaryText: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
    color: Nexus.darkText,
  },
  btnSecondary: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 136, 0.35)",
    backgroundColor: "transparent",
  },
  btnSecondaryText: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    color: Nexus.cyan,
  },
});