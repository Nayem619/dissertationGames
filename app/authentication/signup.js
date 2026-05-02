import { Nexus } from "@/constants/theme";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
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
import { claimUsername, sanitizeUsername } from "@/lib/socialProfile";

export default function Signup() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [usernameTag, setUsernameTag] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setErrorMessage("");

    if (!firstName || !lastName || !email || !password || !repeatPassword) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    if (password !== repeatPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`.trim(),
      });

      const tagSan = sanitizeUsername(usernameTag || "");
      if (tagSan.length >= 3) {
        try {
          await claimUsername(usernameTag);
        } catch (e) {
          console.warn("Gamer tag skipped", e?.message || e);
        }
      }

      router.replace("/home");
    } catch (error) {
      let message = "Signup failed";

      if (error.code === "auth/email-already-in-use") {
        message = "This email is already registered";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email format";
      } else if (error.code === "auth/weak-password") {
        message = "Password is too weak";
      } else {
        message = error.message;
      }

      setErrorMessage(message);
      Alert.alert("Signup Error", message);
    } finally {
      setLoading(false);
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
            <Text style={styles.brand}>Play Hub</Text>
            <Text style={styles.subBrand}>YOUR GAMES · ONE PLACE</Text>

            <View style={styles.segmentRow}>
              <Pressable
                style={styles.segmentInactive}
                onPress={() => router.replace("/authentication/login")}
              >
                <Text style={styles.segmentInactiveText}>LOGIN</Text>
              </Pressable>
              <View style={styles.segmentActive}>
                <Text style={styles.segmentActiveText}>SIGN UP</Text>
              </View>
            </View>

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor={Nexus.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={styles.label}>LAST NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor={Nexus.textMuted}
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={styles.label}>GAMER TAG (optional, for online)</Text>
            <TextInput
              style={styles.input}
              placeholder="letters · numbers · underscores"
              placeholderTextColor={Nexus.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              value={usernameTag}
              maxLength={22}
              onChangeText={setUsernameTag}
            />
            <Text style={styles.helpSmall}>
              Saves as {sanitizeUsername(usernameTag) || "(min 3 chars to save)"} · you can set later in Social.
            </Text>

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Nexus.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Nexus.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.label}>REPEAT PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor={Nexus.textMuted}
              secureTextEntry
              value={repeatPassword}
              onChangeText={setRepeatPassword}
            />

            <Pressable
              style={({ pressed }) => [
                styles.submit,
                loading && styles.submitDisabled,
                pressed && !loading && { opacity: 0.9 },
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "CREATING…" : "JOIN PLAY HUB"}
              </Text>
            </Pressable>

            <Text style={styles.footText}>
              Already have an account?{" "}
              <Text
                style={styles.link}
                onPress={() => router.replace("/authentication/login")}
              >
                Log in
              </Text>
            </Text>
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
    bottom: 40,
    left: -60,
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 12,
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
    marginBottom: 20,
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
    fontSize: 40,
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
    fontSize: 14,
    marginBottom: 16,
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
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.3)",
    backgroundColor: Nexus.bgElevated,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 16,
    color: Nexus.text,
  },
  helpSmall: {
    color: Nexus.textMuted,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 14,
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  submit: {
    width: "100%",
    marginTop: 8,
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
  submitDisabled: {
    opacity: 0.6,
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
});
