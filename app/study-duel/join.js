import { Nexus } from "@/constants/theme";
import { bindResponderToStudyDuel } from "@/lib/studyDuels";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

export default function StudyDuelJoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromLink = paramFirst(params, "id") || "";
  const [inviteId, setInviteId] = useState(String(fromLink).trim());
  const [busy, setBusy] = useState(false);

  const onJoin = async () => {
    const id = inviteId.trim();
    if (!id) {
      Alert.alert("Invite", "Paste the duel ID your partner sent.");
      return;
    }
    setBusy(true);
    try {
      await bindResponderToStudyDuel(id);
      Alert.alert(
        "Paired",
        "You are locked in as the responder. Ask for the room code, then join from the online lobby — treatment assignment appears once both players are seated."
      );
      router.replace("/multiplayer");
    } catch (e) {
      Alert.alert("Join duel", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.pad}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.h1}>Join study duel</Text>
        <Text style={s.p}>
          Paste the invite ID (or open the deep link). Pair before you join the Firestore room so lab seats can resolve.
        </Text>
        <TextInput
          style={s.input}
          placeholder="Duel invite ID"
          placeholderTextColor={Nexus.textMuted}
          autoCapitalize="none"
          value={inviteId}
          onChangeText={setInviteId}
        />
        <TouchableOpacity style={s.go} disabled={busy} onPress={() => void onJoin()}>
          <Text style={s.goT}>{busy ? "Pairing…" : "Pair as responder"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.out} onPress={() => router.replace("/multiplayer")}>
          <Text style={s.outT}>Open online lobby</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22 },
  back: { color: Nexus.cyan, marginBottom: 16 },
  h1: { fontSize: 24, fontWeight: "900", color: Nexus.green, marginBottom: 10 },
  p: { color: Nexus.textMuted, lineHeight: 22, marginBottom: 16 },
  input: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    borderRadius: 10,
    padding: 14,
    color: Nexus.text,
    marginBottom: 16,
  },
  go: {
    backgroundColor: Nexus.magenta,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  goT: { color: "#fff", fontWeight: "900", fontSize: 16 },
  out: { padding: 12, alignItems: "center" },
  outT: { color: Nexus.cyan, fontWeight: "800" },
});
