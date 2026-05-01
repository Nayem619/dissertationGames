import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import { sanitizeUsername, claimUsername } from "@/lib/socialProfile";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function SetUsernameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params.returnTo === "string" ? params.returnTo : "/social";
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = sanitizeUsername(raw) || "";

  const onSave = async () => {
    if (!auth.currentUser) {
      Alert.alert("Sign in", "Sign in before choosing a username.");
      return;
    }
    setBusy(true);
    try {
      await claimUsername(raw);
      const target = returnTo.startsWith("/") ? returnTo : `/social`;
      router.replace(target);
    } catch (e) {
      Alert.alert("Username", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <View style={s.pad}>
        <Text style={s.h1}>Choose a gamer tag</Text>
        <Text style={s.p}>
          3–18 characters · letters, numbers, underscores. Shown on match history and when friends
          look you up.
        </Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. nexus_star"
          placeholderTextColor={Nexus.textMuted}
          value={raw}
          maxLength={24}
          onChangeText={setRaw}
        />
        <Text style={s.preview}>
          Saves as · <Text style={s.previewH}>{preview || "(type something)"}</Text>
        </Text>
        <TouchableOpacity style={s.primary} disabled={busy} onPress={() => void onSave()}>
          <Text style={s.pt}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.back} disabled={busy} onPress={() => router.back()}>
          <Text style={s.bt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22 },
  h1: { fontSize: 24, fontWeight: "900", color: Nexus.green, marginBottom: 10 },
  p: { color: Nexus.textMuted, lineHeight: 22, marginBottom: 16 },
  input: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    borderRadius: 10,
    padding: 14,
    color: Nexus.text,
    marginBottom: 8,
    fontWeight: "600",
  },
  preview: { color: Nexus.textMuted, marginBottom: 20 },
  previewH: { color: Nexus.cyan, fontWeight: "900" },
  primary: {
    backgroundColor: Nexus.magenta,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  pt: { color: "#fff", fontWeight: "900", fontSize: 16 },
  back: { alignItems: "center", padding: 12 },
  bt: { color: Nexus.textMuted, fontWeight: "700" },
});
