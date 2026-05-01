import RoomChat from "@/app/multiplayer/RoomChat";
import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import {
  castRematchVote,
  consumeUndoTTT,
  markCell,
  millisSinceOtherMoved,
  notifyParticipantLeft,
  opponentVacatedMatch,
  seatGetsTttUndo,
  subscribeRoom,
  tryCommitRematchReset,
} from "@/lib/multiplayerRooms";
import { logResearchEvent } from "@/lib/dissertation";
import { tryCommitTerminalMatchRecord } from "@/lib/matchHistory";
import { getStudyDuel, summarizeBlindRevealForUid } from "@/lib/studyDuels";
import { studyDecisionEnd, studyDecisionStart } from "@/lib/studySession";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Internal redirect (TTT ⇄ chess) must not ping `participantLeft` on the teammate. */
const CHESS_BRIDGE_MS = 900;

export default function MultiplayerPlay() {
  const router = useRouter();
  const navigation = useNavigation();
  const chessBridgeRef = useRef(false);
  const duelRevealRef = useRef(false);

  const p = useLocalSearchParams();
  const room = (paramFirst(p, "room") || "").toUpperCase();
  const uid = auth.currentUser?.uid;

  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  const funnelRef = useRef({ started: false, ended: false });
  const firstMoveRef = useRef(false);
  const seqRef = useRef(null);

  useEffect(() => {
    if (!room) return undefined;
    const unsub = subscribeRoom(room, (d) => {
      setData(d);
      setErr(d ? null : "Room missing");
      if (!d) return;
      if (String(d.game || "tictactoe") !== "chess") return;
      chessBridgeRef.current = true;
      router.replace({ pathname: "/multiplayer/chess-play", params: { room } });
      setTimeout(() => {
        chessBridgeRef.current = false;
      }, CHESS_BRIDGE_MS);
    });
    return () => unsub && unsub();
  }, [room, router]);

  useEffect(() => {
    if (!uid || !room) return undefined;
    const sub = navigation.addListener("beforeRemove", () => {
      if (chessBridgeRef.current) return;
      void notifyParticipantLeft(room, uid);
    });
    return sub;
  }, [navigation, room, uid]);

  useEffect(() => {
    const seq = Number(data?.sessionSeq ?? 1);
    if (seqRef.current !== null && seqRef.current !== seq) {
      firstMoveRef.current = false;
      funnelRef.current = { started: false, ended: false };
      duelRevealRef.current = false;
    }
    seqRef.current = seq;
  }, [data?.sessionSeq]);

  useEffect(() => {
    if (!room || !uid || !data?.guestUid) return;
    const gone = opponentVacatedMatch(data, uid);
    if (!(data?.winner || gone)) return;
    const duelId = typeof data?.studyDuelId === "string" ? data.studyDuelId.trim() : "";
    if (!duelId || duelRevealRef.current) return;
    duelRevealRef.current = true;
    (async () => {
      const duel = await getStudyDuel(duelId);
      const s = summarizeBlindRevealForUid(duel, uid);
      if (s) Alert.alert("Study duel", `${s.headline}\n${s.policy}`);
    })();
  }, [room, uid, data]);

  useEffect(() => {
    if (!room || !data?.guestUid) return;
    if (!funnelRef.current.started) {
      funnelRef.current.started = true;
      void logResearchEvent("mp_match_started", { game: "tictactoe", room });
    }
  }, [room, data?.guestUid]);

  useEffect(() => {
    if (!room || !data?.guestUid) return;
    if (!(data?.winner || opponentVacatedMatch(data, uid))) return;
    void tryCommitTerminalMatchRecord(room);
  }, [room, data, uid]);

  useEffect(() => {
    if (!room || !data?.guestUid) return;
    const gone = opponentVacatedMatch(data, uid);
    if (!(data?.winner || gone)) return;
    if (funnelRef.current.ended) return;
    funnelRef.current.ended = true;
    void logResearchEvent("mp_match_ended", {
      game: "tictactoe",
      room,
      outcome: gone ? "abandon" : data.winner === "Draw" ? "draw" : "win",
    });
  }, [room, data, uid]);

  useEffect(() => {
    if (!room || !data?.guestUid || !data?.hostUid) return;
    const v = data.rematchVotes || {};
    if (v[data.hostUid] && v[data.guestUid]) void tryCommitRematchReset(room);
  }, [room, data]);

  const leaveToLobby = useCallback(() => {
    chessBridgeRef.current = false;
    router.replace("/multiplayer");
  }, [router]);

  if (!room) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.e}>No room code</Text>
        <TouchableOpacity onPress={() => router.replace("/multiplayer")}>
          <Text style={styles.link}>Lobby</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.e}>Sign in required</Text>
      </SafeAreaView>
    );
  }

  if (err || data === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Nexus.green} />
        <Text style={styles.p}>Connecting…</Text>
      </SafeAreaView>
    );
  }

  const g = String(data.game || "tictactoe");
  if (g === "chess") {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Nexus.green} />
        <Text style={styles.p}>Opening chess…</Text>
      </SafeAreaView>
    );
  }

  const isHost = data.hostUid === uid;
  const myMark = isHost ? "X" : "O";
  const board = (data.board || "         ").split("");
  const winner = data.winner;
  const oppGone = opponentVacatedMatch(data, uid);
  const myTurn =
    data.turnMark === myMark &&
    !!(data.guestUid) &&
    !winner &&
    !oppGone;

  const press = async (i) => {
    if (oppGone || winner) return;
    const dk = `ttt_mv_${room}_${Number(data.sessionSeq ?? 1)}_${i}`;
    studyDecisionStart(dk);
    try {
      await markCell(room, i, uid);
      await studyDecisionEnd(dk, { game: "tictactoe", room, sq: i, ok: true });
      if (!firstMoveRef.current) {
        firstMoveRef.current = true;
        void logResearchEvent("mp_first_move", { game: "tictactoe", room });
      }
    } catch (e) {
      await studyDecisionEnd(dk, { game: "tictactoe", room, sq: i, ok: false });
      Alert.alert("Move", String(e?.message || e));
    }
  };

  let statusHint = "";
  if (oppGone) {
    statusHint = "Opponent left · this match ended.";
  } else if (!data.guestUid && isHost) {
    statusHint = "Waiting for opponent to join…";
  } else if (winner) {
    statusHint = "";
  } else if (myTurn) {
    statusHint = "Your turn";
  } else {
    statusHint = data.guestUid ? "Waiting on opponent…" : "Waiting…";
  }

  const msQuiet = millisSinceOtherMoved(data, uid);
  const showStaleHint =
    !!data.guestUid && !winner && !oppGone && msQuiet !== null && msQuiet > 95_000;
  const canVoteRematch = !!(data.guestUid && winner && !oppGone);
  const canUndo =
    seatGetsTttUndo(data, uid) &&
    !!data?.guestUid &&
    !!data?.undoStaging?.moverUid &&
    data.undoStaging.moverUid === uid &&
    !winner &&
    !oppGone;

  const onUndo = async () => {
    try {
      await consumeUndoTTT(room, uid);
      void logResearchEvent("ttt_lab_undo_used", { room });
    } catch (e) {
      Alert.alert("Undo", String(e?.message || e));
    }
  };
  const foeTag =
    uid === data.hostUid
      ? data.guestUsername || "Opponent"
      : data.hostUsername || "Opponent";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollInner}>
        <View style={styles.top}>
          <TouchableOpacity onPress={leaveToLobby}>
            <Text style={styles.back}>← Lobby</Text>
          </TouchableOpacity>
          <Text style={styles.room}>Room {room}</Text>
        </View>
        <Text style={styles.meta}>
          You are {myMark}
          {!oppGone ? ` · ${statusHint}` : ""}
        </Text>
        {data.guestUid ? (
          <Text style={styles.foeLine}>vs @{String(foeTag).replace(/^@/, "")}</Text>
        ) : null}
        {showStaleHint ? (
          <Text style={styles.staleHint}>
            Opponent has been quiet for a while — they may have lost connection.
          </Text>
        ) : null}
        {oppGone ? (
          <>
            <View style={styles.abandonBanner}>
              <Text style={styles.abandonT}>{statusHint}</Text>
              <Text style={styles.abandonSub}>No need to stay on this screen — go back anytime.</Text>
            </View>
            <TouchableOpacity style={styles.abandonBtn} onPress={leaveToLobby}>
              <Text style={styles.abandonBtnT}>Back to online lobby</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {winner && !oppGone ? (
          <Text style={styles.win}>{winner === "Draw" ? "Draw" : `Winner: ${winner}`}</Text>
        ) : null}
        {canVoteRematch ? (
          <View style={styles.remWrap}>
            <Text style={styles.remHint}>Same room code · both tap when you want another round.</Text>
            <TouchableOpacity style={styles.remBtn} onPress={() => void castRematchVote(room, uid)}>
              <Text style={styles.remBtnT}>Vote rematch</Text>
            </TouchableOpacity>
            {data.rematchVotes?.[uid] ? <Text style={styles.remYou}>You voted ✓</Text> : null}
          </View>
        ) : null}
        {canUndo ? (
          <TouchableOpacity style={styles.undoBtn} onPress={() => void onUndo()}>
            <Text style={styles.undoBtnT}>Undo last move once (lab)</Text>
          </TouchableOpacity>
        ) : null}
        {!oppGone ? (
          <View style={styles.grid}>
            {board.map((cell, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.cell}
                onPress={() => press(idx)}
                disabled={!myTurn || !!winner || oppGone}
              >
                <Text style={styles.mark}>{cell.trim() || " "}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <RoomChat roomCode={room} myUid={uid} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  scrollInner: { padding: 16, paddingBottom: 32 },
  top: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  back: { color: Nexus.cyan, fontWeight: "700" },
  room: { color: Nexus.green, fontWeight: "800" },
  meta: { color: Nexus.textMuted, marginBottom: 12 },
  foeLine: { color: Nexus.cyan, fontWeight: "700", marginBottom: 8 },
  staleHint: {
    color: Nexus.pink,
    marginBottom: 12,
    lineHeight: 20,
    fontWeight: "600",
  },
  abandonBanner: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,0,136,0.45)",
    backgroundColor: "rgba(255,0,136,0.09)",
    marginBottom: 12,
  },
  abandonT: { color: Nexus.magenta, fontWeight: "800", fontSize: 16 },
  abandonSub: { color: Nexus.textMuted, marginTop: 8, lineHeight: 20 },
  abandonBtn: {
    marginBottom: 16,
    backgroundColor: Nexus.cyan,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  abandonBtnT: { fontWeight: "900", color: Nexus.darkText },
  win: { fontSize: 20, fontWeight: "800", color: Nexus.magenta, marginBottom: 12 },
  remWrap: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    backgroundColor: Nexus.bgCard,
  },
  remHint: { color: Nexus.textMuted, marginBottom: 10, lineHeight: 20 },
  remBtn: {
    backgroundColor: Nexus.green,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  remBtnT: { color: Nexus.darkText, fontWeight: "900" },
  remYou: { color: Nexus.green, marginTop: 8, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 280, alignSelf: "center" },
  cell: {
    width: 92,
    height: 92,
    borderWidth: 2,
    borderColor: Nexus.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Nexus.bgCard,
  },
  mark: { fontSize: 42, fontWeight: "900", color: Nexus.text },
  undoBtn: {
    alignSelf: "center",
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Nexus.cyan,
    backgroundColor: "rgba(0,212,255,0.08)",
  },
  undoBtnT: { color: Nexus.cyan, fontWeight: "800" },
  p: { color: Nexus.textMuted, marginTop: 12 },
  e: { color: "#faa", marginBottom: 12 },
  link: { color: Nexus.cyan },
});
