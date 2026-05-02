import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import { useAppPrefs } from "@/context/AppPrefs";
import { useMembership } from "@/context/MembershipContext";
import { flagsFromCohortLetter } from "@/lib/abExperiments";
import { ensureAbVariant, logResearchEvent } from "@/lib/dissertation";
import { hostChessRoom, hostTicTacToeRoom, joinRoomAsGuest, peekRoomGame } from "@/lib/multiplayerRooms";
import { peekPendingStudyDuelInvite, takePendingStudyDuelInvite } from "@/lib/studyDuelBridge";
import { markStudyDuelRoom, getStudyDuel } from "@/lib/studyDuels";
import { getPublicProfile } from "@/lib/socialProfile";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function MultiplayerLobby() {
  const router = useRouter();
  const { prefs, refresh } = useAppPrefs();
  const { tryLaunch } = useMembership();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(undefined);

  useFocusEffect(
    useCallback(() => {
      void ensureAbVariant();
      void refresh();
      void logResearchEvent("mp_lobby_open", {});
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setGate("noauth");
        return;
      }
      (async () => {
        const prof = await getPublicProfile(uid);
        const tag = String(prof?.username || prof?.usernameLower || "").trim();
        setGate(tag ? "ok" : "need");
      })();
    }, [refresh])
  );

  if (gate === undefined) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={Nexus.green} style={{ marginTop: 40 }} />
        <Text style={s.p}>Loading…</Text>
      </SafeAreaView>
    );
  }

  if (gate === "noauth") {
    return (
      <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
        <StatusBar style="light" />
        <View style={s.pad}>
          <Text style={s.h1}>Online rooms</Text>
          <Text style={s.p}>Sign in to host or join synced games.</Text>
          <TouchableOpacity style={s.secondary} onPress={() => router.replace("/authentication/login")}>
            <Text style={s.st}>Go to sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.back} onPress={() => router.back()} disabled={busy}>
            <Text style={s.bt}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (gate === "need") {
    return (
      <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
        <StatusBar style="light" />
        <View style={s.pad}>
          <Text style={s.h1}>Gamer tag needed</Text>
          <Text style={s.p}>
            Choose a unique username so opponents show up in your match history and on friend lists.
          </Text>
          <TouchableOpacity
            style={s.primary}
            onPress={() =>
              router.push({
                pathname: "/social/username",
                params: { returnTo: "/multiplayer" },
              })
            }
          >
            <Text style={s.pt}>Set username</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.back} onPress={() => router.push("/social")}>
            <Text style={s.bt}>Open Play Hub social</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.bt}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ensureOnlineEntitlement = async () => {
    const r = await tryLaunch("online");
    if (!r.ok) {
      Alert.alert(
        "Play limit",
        "You've used the free trial sessions for online rooms this week. Unlock unlimited play from the membership screen.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "View plans",
            onPress: () => router.push("/membership"),
          },
        ]
      );
      return false;
    }
    return true;
  };

  const onHostTTT = async () => {
    if (!(await ensureOnlineEntitlement())) return;
    setBusy(true);
    try {
      const duelId = takePendingStudyDuelInvite();
      let hostOpts;
      if (duelId) {
        const duel = await getStudyDuel(duelId);
        if (duel && duel.game !== "tictactoe") {
          Alert.alert(
            "Mismatched duel",
            `This duel is set for ${String(duel.game)} — cancel it or choose the matching host button.`
          );
          setBusy(false);
          return;
        }
        hostOpts = { studyDuelId: duelId, expChessLegalHints: false, expTttUndo: false };
      } else {
        const cohort = prefs.abVariant
          ? flagsFromCohortLetter(prefs.abVariant)
          : flagsFromCohortLetter(await ensureAbVariant());
        hostOpts = {
          studyDuelId: "",
          expChessLegalHints: cohort.chessLegalHints,
          expTttUndo: cohort.tttUndoOnceEachSide,
        };
      }
      const c = await hostTicTacToeRoom(hostOpts);
      if (duelId) await markStudyDuelRoom(duelId, c);
      router.replace({ pathname: "/multiplayer/play", params: { room: c } });
    } catch (e) {
      Alert.alert("Host failed", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const onHostChess = async () => {
    if (!(await ensureOnlineEntitlement())) return;
    setBusy(true);
    try {
      const duelId = takePendingStudyDuelInvite();
      let hostOpts;
      if (duelId) {
        const duel = await getStudyDuel(duelId);
        if (duel && duel.game !== "chess") {
          Alert.alert(
            "Mismatched duel",
            `This duel is set for ${String(duel.game)} — cancel it or host the matching game.`
          );
          setBusy(false);
          return;
        }
        hostOpts = { studyDuelId: duelId, expChessLegalHints: false, expTttUndo: false };
      } else {
        const cohort = prefs.abVariant
          ? flagsFromCohortLetter(prefs.abVariant)
          : flagsFromCohortLetter(await ensureAbVariant());
        hostOpts = {
          studyDuelId: "",
          expChessLegalHints: cohort.chessLegalHints,
          expTttUndo: cohort.tttUndoOnceEachSide,
        };
      }
      const c = await hostChessRoom(hostOpts);
      if (duelId) await markStudyDuelRoom(duelId, c);
      router.replace({ pathname: "/multiplayer/chess-play", params: { room: c } });
    } catch (e) {
      Alert.alert("Host failed", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const duelPendingHint = peekPendingStudyDuelInvite();
  const onJoin = async () => {
    if (!code.trim()) return;
    if (!(await ensureOnlineEntitlement())) return;
    setBusy(true);
    try {
      const c = await joinRoomAsGuest(code);
      const g = (await peekRoomGame(c)) ?? "tictactoe";
      if (g === "chess") {
        router.replace({ pathname: "/multiplayer/chess-play", params: { room: c } });
      } else {
        router.replace({ pathname: "/multiplayer/play", params: { room: c } });
      }
    } catch (e) {
      Alert.alert("Join failed", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <View style={s.pad}>
        <Text style={s.h1}>Online rooms</Text>
        <Text style={s.p}>
          Two signed-in players share one Firestore room. Same 6-letter code on both devices · live messages live in{" "}
          <Text style={{ color: Nexus.cyan }}>{`multiplayer_rooms/{code}/messages`}</Text>. Online chess host = White · guest = Black.
          Arcade also lists separate <Text style={{ fontWeight: "800", color: Nexus.text }}>vendor chess &amp; Ludo</Text> URLs
          (own servers / sockets — see <Text style={{ fontWeight: "700", color: Nexus.magenta }}>vendor/ARCADE_LOCAL_DEV.md</Text>).
        </Text>
        <Text style={s.pMuted}>
          Research cohort UX: {!prefs.abVariant ? "refreshing…" : prefs.abVariant === "B" ? "B · treatment overlays" : "A · control"}
          {duelPendingHint ? " · Duel invite pending host" : ""}
          {!prefs.studyDuelOptIn ? " · Study duel UI off (Settings diss. tools)" : ""}
        </Text>
        {prefs.studyDuelOptIn ? (
          <>
            <TouchableOpacity style={s.secondary} onPress={() => router.push("/study-duel")} disabled={busy}>
              <Text style={s.st}>Blind pairwise study duel setup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.secondary}
              onPress={() => router.push("/study-duel/join")}
              disabled={busy}
            >
              <Text style={s.st}>Join study duel invite</Text>
            </TouchableOpacity>
          </>
        ) : null}
        <TouchableOpacity style={s.primary} onPress={onHostTTT} disabled={busy}>
          <Text style={s.pt}>Host Tic‑Tac‑Toe room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondary} onPress={onHostChess} disabled={busy}>
          <Text style={s.st}>Host online chess room</Text>
        </TouchableOpacity>
        <Text style={s.label}>Join with code</Text>
        <TextInput
          style={s.input}
          autoCapitalize="characters"
          maxLength={8}
          placeholder="e.g. ABC12X"
          placeholderTextColor={Nexus.textMuted}
          value={code}
          onChangeText={setCode}
        />
        <TouchableOpacity style={s.join} onPress={onJoin} disabled={busy}>
          <Text style={s.jt}>Join room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.back} onPress={() => router.push("/social")} disabled={busy}>
          <Text style={[s.bt, { color: Nexus.cyan }]}>Play Hub social · history & friends</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.back} onPress={() => router.back()} disabled={busy}>
          <Text style={s.bt}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22 },
  h1: { fontSize: 26, fontWeight: "900", color: Nexus.green, marginBottom: 12 },
  p: { color: Nexus.textMuted, lineHeight: 20, marginBottom: 18 },
  pMuted: {
    color: Nexus.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  primary: {
    backgroundColor: Nexus.green,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  pt: { color: Nexus.darkText, fontWeight: "800", fontSize: 16 },
  secondary: {
    borderWidth: 2,
    borderColor: Nexus.cyan,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  st: { color: Nexus.cyan, fontWeight: "800", fontSize: 16 },
  label: { color: Nexus.text, fontWeight: "700", marginBottom: 8 },
  input: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    borderRadius: 10,
    padding: 14,
    color: Nexus.text,
    marginBottom: 12,
  },
  join: {
    backgroundColor: Nexus.magenta,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  jt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  back: { alignItems: "center", padding: 14 },
  bt: { color: Nexus.textMuted, fontWeight: "700" },
});
