import { Nexus } from "@/constants/theme";
import { createBlindStudyDuelInvite } from "@/lib/studyDuels";
import { setPendingStudyDuelInvite } from "@/lib/studyDuelBridge";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { shareStudyDuelLinks } from "@/lib/publicWebUrl";

export default function StudyDuelHostScreen() {
  const router = useRouter();
  const [game, setGame] = useState("tictactoe");
  const [inviteId, setInviteId] = useState("");
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    setBusy(true);
    try {
      const row = await createBlindStudyDuelInvite(game === "chess" ? "chess" : "tictactoe");
      setInviteId(row.duelId);
      setPendingStudyDuelInvite(row.duelId);
      const { message } = shareStudyDuelLinks(row.duelId);
      Alert.alert(
        "Duel created",
        `You are blind‑assigned letter ${row.challengerLetter}. Host the matching room next, then share the invite ID with your partner.`
      );
      try {
        await Share.share({ message: `Play Hub study duel\nID: ${row.duelId}\n${message}` });
      } catch {
        Alert.alert("Invite", `Copy manually:\n${row.duelId}\n${message}`);
      }
    } catch (e) {
      Alert.alert("Duel", String(e?.message || e));
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
        <Text style={s.h1}>Blind study duel</Text>
        <Text style={s.p}>
          Challenger creates the invite, hosts the room, and shares the ID. Responders join the invite first so
          lettering stays private until the match ends.
        </Text>
        <View style={s.row}>
          <TouchableOpacity
            style={[s.pill, game === "tictactoe" && s.pillOn]}
            onPress={() => setGame("tictactoe")}
          >
            <Text style={s.pillT}>TTT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, game === "chess" && s.pillOn]}
            onPress={() => setGame("chess")}
          >
            <Text style={s.pillT}>Chess</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.go} disabled={busy} onPress={() => void onCreate()}>
          <Text style={s.goT}>{busy ? "Creating…" : "Create invite & stage host"}</Text>
        </TouchableOpacity>
        {inviteId ? (
          <Text style={s.mono}>
            Invite ID · {inviteId}
            {"\n"}Next: open Online rooms and host the matching game (duel is queued).
          </Text>
        ) : null}
        <TouchableOpacity style={s.out} onPress={() => router.replace("/multiplayer")}>
          <Text style={s.outT}>Open online lobby →</Text>
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
  row: { flexDirection: "row", gap: 12, marginBottom: 18 },
  pill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    paddingVertical: 12,
    alignItems: "center",
  },
  pillOn: { borderColor: Nexus.green, backgroundColor: "rgba(0,255,136,0.12)" },
  pillT: { color: Nexus.text, fontWeight: "800" },
  go: {
    backgroundColor: Nexus.magenta,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  goT: { color: "#fff", fontWeight: "900", fontSize: 16 },
  mono: { color: Nexus.cyan, marginBottom: 22, lineHeight: 22, fontSize: 13 },
  out: { padding: 12, alignItems: "center" },
  outT: { color: Nexus.green, fontWeight: "800" },
});
