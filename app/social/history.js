import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import { listMyRecentMatches } from "@/lib/matchHistory";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function fmtOpponent(entry, viewerUid) {
  const hm = entry?.participantNames || {};
  const a = entry?.hostUid;
  const b = entry?.guestUid;
  const other = a === viewerUid ? b : a;
  const name = hm[other] || "Opponent";
  return `@${name}`;
}

function outcomeLine(entry, viewerUid) {
  const ou = entry?.outcome;
  const w = entry?.winnerUid;
  if (!ou && !w) return entry?.summary || "—";
  if (ou === "draw") return "Draw";
  if (ou === "abandon") {
    if (w === viewerUid) return "Opponent quit — you won.";
    return "You left mid-match.";
  }
  if (w === viewerUid) return "Win";
  if (w && w !== viewerUid) return "Loss";
  return entry?.summary || "—";
}

export default function HistoryScreen() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const m = await listMyRecentMatches(50);
      setRows(m);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.pad}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Hub</Text>
        </TouchableOpacity>
        <Text style={s.h1}>Match history</Text>
        {!uid ? (
          <Text style={s.warn}>Sign in first.</Text>
        ) : loading ? (
          <ActivityIndicator color={Nexus.green} />
        ) : rows.length === 0 ? (
          <Text style={s.p}>Finish an online match to see rivals here automatically.</Text>
        ) : (
          rows.map((r) => {
            const otherUid = r.hostUid === uid ? r.guestUid : r.hostUid;
            const game = String(r.game || "") === "chess" ? "Chess" : "TTT";
            return (
              <TouchableOpacity
                key={r.id || `${r.roomCode}-${r.sessionSeq}`}
                style={s.card}
                onPress={() => router.push(`/social/user/${otherUid}`)}
              >
                <Text style={s.row1}>
                  {fmtOpponent(r, uid)}{" "}
                  <Text style={s.dim}>· {game}</Text>
                </Text>
                <Text style={s.row2}>{outcomeLine(r, uid)}</Text>
                <Text style={s.row3}>{r.roomCode ? `Room ${r.roomCode}` : ""}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22, paddingBottom: 44 },
  back: { color: Nexus.cyan, marginBottom: 16, fontWeight: "700" },
  h1: { fontSize: 24, fontWeight: "900", color: Nexus.green, marginBottom: 16 },
  warn: { color: Nexus.pink },
  p: { color: Nexus.textMuted },
  card: {
    backgroundColor: Nexus.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
  },
  row1: { color: Nexus.text, fontWeight: "800", fontSize: 16 },
  dim: { color: Nexus.textMuted, fontWeight: "600" },
  row2: { color: Nexus.cyan, marginTop: 6, fontWeight: "700" },
  row3: { color: Nexus.textMuted, fontSize: 12, marginTop: 6 },
});
