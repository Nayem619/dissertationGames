import { Nexus } from "@/constants/theme";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../constants/firebase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/home");
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      setError("Invalid credentials. Please try again.");
      Alert.alert("Login Error", "Invalid credentials. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "left", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.glowG} />
        <View style={styles.glowM} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.brand}>NEXUS</Text>
            <Text style={styles.subBrand}>GAMING ARENA</Text>

            <View style={styles.segmentRow}>
              <View style={styles.segmentActive}>
                <Text style={styles.segmentActiveText}>LOGIN</Text>
              </View>
              <Pressable
                style={styles.segmentInactive}
                onPress={() => router.push("/authentication/signup")}
              >
                <Text style={styles.segmentInactiveText}>SIGN UP</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              placeholderTextColor={Nexus.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={Nexus.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.submit, pressed && { opacity: 0.9 }]}
              onPress={handleLogin}
            >
              <Text style={styles.submitText}>ENTER NEXUS</Text>
            </Pressable>

            <Text style={styles.footText}>
              New player?{" "}
              <Text
                style={styles.link}
                onPress={() => router.push("/authentication/signup")}
              >
                Sign up
              </Text>
            </Text>

            <Pressable
              style={styles.guest}
              onPress={() => router.replace("/home")}
            >
              <Text style={styles.guestText}>🚪 Skip to games (guest)</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  root: { flex: 1, backgroundColor: Nexus.bg },
  glowG: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0, 255, 136, 0.07)",
    top: -50,
    right: -60,
  },
  glowM: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 0, 255, 0.05)",
    bottom: 80,
    left: -60,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: Nexus.bgCard,
    borderWidth: 2,
    borderColor: Nexus.borderDim,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: Nexus.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 22,
      },
      android: { elevation: 10 },
    }),
  },
  brand: {
    fontSize: 44,
    fontWeight: "900",
    textAlign: "center",
    color: Nexus.green,
    textShadowColor: "rgba(0, 255, 136, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subBrand: {
    textAlign: "center",
    color: Nexus.textMuted,
    fontSize: 15,
    marginBottom: 20,
    letterSpacing: 3,
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: Nexus.bgElevated,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  segmentActive: {
    flex: 1,
    backgroundColor: Nexus.green,
    borderRadius: 8,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: Nexus.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  segmentActiveText: {
    textAlign: "center",
    fontWeight: "800",
    color: Nexus.darkText,
  },
  segmentInactive: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: "center",
  },
  segmentInactiveText: {
    textAlign: "center",
    color: Nexus.textMuted,
    fontWeight: "600",
  },
  label: {
    color: Nexus.green,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.3)",
    backgroundColor: Nexus.bgElevated,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    color: Nexus.text,
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 10,
    textAlign: "center",
  },
  submit: {
    width: "100%",
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Nexus.green,
    ...Platform.select({
      ios: {
        shadowColor: Nexus.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  submitText: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
    color: Nexus.darkText,
  },
  footText: {
    marginTop: 16,
    textAlign: "center",
    color: Nexus.textMuted,
    fontSize: 14,
  },
  link: {
    color: Nexus.cyan,
    fontWeight: "600",
  },
  guest: {
    marginTop: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(153, 153, 170, 0.25)",
    borderRadius: 10,
  },
  guestText: {
    textAlign: "center",
    color: Nexus.textMuted,
    fontSize: 12,
  },
});
