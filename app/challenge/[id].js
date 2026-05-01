import { Nexus } from "@/constants/theme";
import { CHALLENGE_KINDS, getChallengeDoc, softAcceptChallenge } from "@/lib/challenges";
import { shareChallengeLinks } from "@/lib/publicWebUrl";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

function kindLabel(k) {
  if (k === CHALLENGE_KINDS.trivia_streak) return "Trivia quiz score";
  if (k === CHALLENGE_KINDS.runner_best) return "Endless Runner distance";
  if (k === CHALLENGE_KINDS.arcade_flappy) return "Arcade dodge run score";
  if (k === CHALLENGE_KINDS.puzzle_ladder_stages) return "Flow / Pipe / Ice ladder stages cleared";
  return String(k);
}

export default function ChallengeScreen() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const id = String(paramFirst(p, "id") || "").trim();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      const d = await getChallengeDoc(id);
      setRow(d);
      setLoading(false);
      if (!d) Alert.alert("Challenge", "Not found.");
    })();
    return undefined;
  }, [id]);

  const shareDeep = async () => {
    const { message } = shareChallengeLinks(id);
    await Share.share({ message: `${message}\n${kindLabel(row?.kind)} · beat ${row?.targetMetric}` });
  };

  const openChallenge = async () => {
    if (!row?.id) return;
    try {
      await softAcceptChallenge(row.id);
    } catch (e) {
      Alert.alert("Challenge", String(e?.message || e));
      return;
    }
    const target = Number(row.targetMetric);
    const t =
      typeof target === "number" && Number.isFinite(target) ? String(Math.floor(target)) : "1";
    const base = { challengeId: row.id, challengeTarget: t };

    if (row.kind === CHALLENGE_KINDS.trivia_streak) {
      router.replace({ pathname: "/trivia/trivia", params: base });
      return;
    }
    if (row.kind === CHALLENGE_KINDS.runner_best) {
      router.replace({ pathname: "/EndlessRunner/endlessrunner", params: base });
      return;
    }
    if (row.kind === CHALLENGE_KINDS.arcade_flappy) {
      router.replace({ pathname: "/Arcade/arcade", params: { ...base, play: "flappy" } });
      return;
    }
    if (row.kind === CHALLENGE_KINDS.puzzle_ladder_stages) {
      router.replace({
        pathname: "/puzzle-ladder",
        params: {
          challengeId: row.id,
          challengeFloors: t,
        },
      });
      return;
    }
    Alert.alert("Challenge", `Unsupported kind: ${String(row.kind)}`);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.pad}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator color={Nexus.green} style={{ marginTop: 24 }} />
        ) : !row ? (
          <Text style={s.p}>Missing or invalid challenge id.</Text>
        ) : (
          <>
            <Text style={s.h1}>Async challenge</Text>
            <Text style={s.p}>
              From @{String(row.issuerTagClean || "?")}: beat{" "}
              <Text style={s.bold}>{kindLabel(row.kind)}</Text> · target ≥{" "}
              <Text style={s.bold}>{String(row.targetMetric)}</Text>
            </Text>
            {row.memo ? <Text style={s.memo}>{String(row.memo)}</Text> : null}
            <TouchableOpacity style={s.go} onPress={() => void openChallenge()}>
              <Text style={s.goT}>Open game & attempt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sec} onPress={() => void shareDeep()}>
              <Text style={s.secT}>Share deep link</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22 },
  back: { color: Nexus.cyan, marginBottom: 16 },
  h1: { fontSize: 26, fontWeight: "900", color: Nexus.green, marginBottom: 12 },
  p: { color: Nexus.textMuted, lineHeight: 22, marginBottom: 16 },
  bold: { color: Nexus.text, fontWeight: "800" },
  memo: { color: Nexus.cyan, marginBottom: 16, fontSize: 13 },
  go: {
    backgroundColor: Nexus.magenta,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  goT: { color: "#fff", fontWeight: "900", fontSize: 16 },
  sec: {
    borderWidth: 2,
    borderColor: Nexus.cyan,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secT: { color: Nexus.cyan, fontWeight: "800" },
});
