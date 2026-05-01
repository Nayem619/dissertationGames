import RoomChat from "@/app/multiplayer/RoomChat";
import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import { Chess, DEFAULT_POSITION } from "@/lib/third_party/chess.esm";
import {
  applyChessMove,
  castRematchVote,
  millisSinceOtherMoved,
  notifyParticipantLeft,
  opponentVacatedMatch,
  seatGetsChessLegalHints,
  subscribeRoom,
  tryCommitRematchReset,
} from "@/lib/multiplayerRooms";
import { logResearchEvent } from "@/lib/dissertation";
import { tryCommitTerminalMatchRecord } from "@/lib/matchHistory";
import { getStudyDuel, summarizeBlindRevealForUid } from "@/lib/studyDuels";
import { studyDecisionEnd, studyDecisionStart } from "@/lib/studySession";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

const PIECE = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

function displayToSquare(displayRow, displayCol, guest) {
  if (!guest) {
    const rank = 8 - displayRow;
    const file = displayCol;
    return String.fromCharCode(97 + file) + rank;
  }
  const rank = displayRow + 1;
  const file = 7 - displayCol;
  return String.fromCharCode(97 + file) + rank;
}

function coordFont(cellSize) {
  return { fontSize: Math.max(7, Math.floor(cellSize * 0.2)) };
}

/** Internal redirect (chess → TTT) must not notify `participantLeft`. */
const TTT_BRIDGE_MS = 900;

export default function ChessMultiplayerPlay() {
  const router = useRouter();
  const navigation = useNavigation();
  const tttBridgeRef = useRef(false);
  const duelRevealRef = useRef(false);
  const { width } = useWindowDimensions();
  const p = useLocalSearchParams();
  const room = (paramFirst(p, "room") || "").toUpperCase();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [picked, setPicked] = useState(null);
  const uid = auth.currentUser?.uid;
  const funnelRef = useRef({ started: false, ended: false });
  const firstMoveRef = useRef(false);
  const seqRef = useRef(null);
  const boardOuter = Math.min(Math.floor(width - 32), 360);
  const cellSize = Math.max(34, Math.floor(boardOuter / 8));

  useEffect(() => {
    if (!room) return undefined;
    const unsub = subscribeRoom(room, (d) => {
      setData(d);
      setErr(d ? null : "Room missing");
      if (!d) return;
      const g = String(d.game || "tictactoe");
      if (g === "chess") return;
      tttBridgeRef.current = true;
      router.replace({ pathname: "/multiplayer/play", params: { room } });
      setTimeout(() => {
        tttBridgeRef.current = false;
      }, TTT_BRIDGE_MS);
    });
    return () => unsub && unsub();
  }, [room, router]);

  useEffect(() => {
    if (!uid || !room) return undefined;
    return navigation.addListener("beforeRemove", () => {
      if (tttBridgeRef.current) return;
      void notifyParticipantLeft(room, uid);
    });
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
    if (!room || !data?.guestUid) return;
    if (!funnelRef.current.started) {
      funnelRef.current.started = true;
      void logResearchEvent("mp_match_started", { game: "chess", room });
    }
  }, [room, data?.guestUid]);

  useEffect(() => {
    if (!room || !data?.guestUid) return;
    const r = typeof data?.result === "string" ? data.result : null;
    const gone = opponentVacatedMatch(data, uid);
    if (!r && !gone) return;
    void tryCommitTerminalMatchRecord(room);
  }, [room, data, uid]);

  useEffect(() => {
    if (!room || !data?.guestUid) return;
    const r = typeof data?.result === "string" ? data.result : null;
    const gone = opponentVacatedMatch(data, uid);
    if (!r && !gone) return;
    if (funnelRef.current.ended) return;
    funnelRef.current.ended = true;
    let outcome = "draw";
    if (gone) outcome = "abandon";
    else if (r && r !== "draw") outcome = "win";
    void logResearchEvent("mp_match_ended", { game: "chess", room, outcome });
  }, [room, data, uid]);

  useEffect(() => {
    if (!room || !data?.guestUid || !data?.hostUid) return;
    const v = data.rematchVotes || {};
    if (v[data.hostUid] && v[data.guestUid]) void tryCommitRematchReset(room);
  }, [room, data]);

  useEffect(() => {
    if (!room || !uid || !data?.guestUid) return;
    const r = typeof data?.result === "string" ? data.result : null;
    const gone = opponentVacatedMatch(data, uid);
    if (!r && !gone) return;
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
    if (data && opponentVacatedMatch(data, uid)) setPicked(null);
  }, [data, uid]);

  const leaveToLobby = useCallback(() => {
    tttBridgeRef.current = false;
    router.replace("/multiplayer");
  }, [router]);

  const gameSnap = useMemo(() => {
    if (!data || (data.game || "") !== "chess") return null;
    try {
      return new Chess(typeof data.fen === "string" ? data.fen : DEFAULT_POSITION);
    } catch {
      return null;
    }
  }, [data]);

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

  const g0 = String(data.game || "tictactoe");
  if (g0 !== "chess") {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Nexus.green} />
        <Text style={styles.p}>Opening Tic-Tac-Toe…</Text>
      </SafeAreaView>
    );
  }

  if (!gameSnap) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.e}>Invalid chess position in room</Text>
        <TouchableOpacity onPress={() => router.replace("/multiplayer")}>
          <Text style={styles.link}>Lobby</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isHost = data.hostUid === uid;
  const guest = !isHost;
  const result = typeof data.result === "string" ? data.result : null;
  const oppGone = opponentVacatedMatch(data, uid);
  const myColor = isHost ? "w" : "b";
  const myTurn =
    !!(data.guestUid && gameSnap.turn() === myColor && !result && !oppGone);

  const showLegalHints = seatGetsChessLegalHints(data, uid);

  /** @type {Record<string,true>} */
  const dest = {};
  if (picked && myTurn && result == null) {
    const ms = gameSnap.moves({ square: picked, verbose: true });
    for (let i = 0; i < ms.length; i++) dest[ms[i].to] = true;
  }

  const onCell = async (square) => {
    if (oppGone || !data.guestUid || result || !myTurn) return;
    const here = gameSnap.get(square);
    if (!picked) {
      if (!here || here.color !== myColor) return;
      setPicked(square);
      return;
    }
    if (picked === square) {
      setPicked(null);
      return;
    }
    if (here && here.color === myColor && square !== picked) {
      setPicked(square);
      return;
    }
    if (!dest[square]) {
      setPicked(null);
      return;
    }
    const dk = `ch_mv_${room}_${Number(data.sessionSeq ?? 1)}_${picked}_${square}`;
    studyDecisionStart(dk);
    try {
      await applyChessMove(room, uid, picked, square);
      setPicked(null);
      await studyDecisionEnd(dk, {
        game: "chess",
        room,
        from: picked,
        to: square,
        ok: true,
      });
      if (!firstMoveRef.current) {
        firstMoveRef.current = true;
        void logResearchEvent("mp_first_move", { game: "chess", room });
      }
    } catch (e) {
      await studyDecisionEnd(dk, {
        game: "chess",
        room,
        from: picked,
        to: square,
        ok: false,
      });
      Alert.alert("Move", String(e?.message || e));
    }
  };

  const statusLine =
    oppGone
      ? "Opponent left · this match ended."
      : !data.guestUid && isHost
        ? "Waiting for opponent to join…"
        : result
          ? result === "draw"
            ? "Draw"
            : result === myColor
              ? "You won"
              : "Opponent wins"
          : gameSnap.turn() === myColor
            ? `Your move · (${myColor === "w" ? "White" : "Black"})`
            : "Opponent thinking…";

  const foeTag =
    uid === data.hostUid
      ? data.guestUsername || "Opponent"
      : data.hostUsername || "Opponent";
  const msQuiet = millisSinceOtherMoved(data, uid);
  const showStaleHint =
    !!data.guestUid &&
    !result &&
    !oppGone &&
    msQuiet !== null &&
    msQuiet > 95_000;
  const canVoteRematch = !!(data.guestUid && result && !oppGone);

  const cells = [];
  for (let dr = 0; dr < 8; dr++) {
    const rowSq = [];
    for (let dc = 0; dc < 8; dc++) {
      const sq = displayToSquare(dr, dc, guest);
      rowSq.push(sq);
    }
    cells.push(rowSq);
  }

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
        <Text style={[styles.meta, oppGone && styles.metaMuted]}>
          You are {isHost ? "White" : "Black"} · {!oppGone ? statusLine : ""}
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
              <Text style={styles.abandonT}>{statusLine}</Text>
              <Text style={styles.abandonSub}>
                You can leave — no moves will count against this opponent.
              </Text>
            </View>
            <TouchableOpacity style={styles.abandonBtn} onPress={leaveToLobby}>
              <Text style={styles.abandonBtnT}>Back to online lobby</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {canVoteRematch ? (
          <View style={styles.remWrap}>
            <Text style={styles.remHint}>Same room code · both tap for another chess round.</Text>
            <TouchableOpacity style={styles.remBtn} onPress={() => void castRematchVote(room, uid)}>
              <Text style={styles.remBtnT}>Vote rematch</Text>
            </TouchableOpacity>
            {data.rematchVotes?.[uid] ? <Text style={styles.remYou}>You voted ✓</Text> : null}
          </View>
        ) : null}

        <View
          style={[
            styles.board,
            { width: cellSize * 8, height: cellSize * 8 },
            oppGone && styles.boardFrozen,
          ]}
        >
          {cells.map((row, ri) => (
            <View key={`r${String(ri)}`} style={[styles.boardRow, { height: cellSize }]}>
              {row.map((sq) => {
                const bf = sq.charCodeAt(0) - 97;
                const rk = Number(sq.slice(1));
                const br = 8 - rk;
                const piece = gameSnap.board()[br][bf];
                const light = (bf + rk) % 2 === 0;
                const sel = picked === sq;
                const canLand = !!(picked && dest[sq]);
                return (
                  <TouchableOpacity
                    key={sq}
                    style={[
                      styles.cellBase,
                      { width: cellSize, height: cellSize },
                      light ? styles.cellLight : styles.cellDark,
                      sel && styles.cellSel,
                      showLegalHints && canLand && styles.cellHint,
                    ]}
                    activeOpacity={0.85}
                    disabled={!!oppGone}
                    onPress={() => onCell(sq)}
                  >
                    <Text
                      style={[
                        styles.piece,
                        { fontSize: Math.min(34, Math.floor(cellSize * 0.76)) },
                        piece?.color === "b" ? styles.pBlk : styles.pWht,
                      ]}
                    >
                      {piece ? PIECE[piece.color][piece.type] : ""}
                    </Text>
                    <Text style={[styles.lab, coordFont(cellSize)]}>{sq}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={styles.tip}>
          {showLegalHints
            ? "Tap your piece · then a highlighted square · tap chosen piece again to cancel."
            : "Tap your piece · then a legal square (no highlight assist in this lobby) · tap piece again to cancel."}
        </Text>

        <RoomChat roomCode={room} myUid={uid} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  scrollInner: { padding: 14, paddingBottom: 32 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  back: { color: Nexus.cyan, fontWeight: "700" },
  room: { color: Nexus.green, fontWeight: "800" },
  meta: { color: Nexus.textMuted, marginBottom: 10 },
  metaMuted: { color: Nexus.magenta },
  foeLine: { color: Nexus.cyan, fontWeight: "700", marginBottom: 8 },
  staleHint: {
    color: Nexus.pink,
    marginBottom: 10,
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
    marginBottom: 14,
    backgroundColor: Nexus.cyan,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  abandonBtnT: { fontWeight: "900", color: Nexus.darkText },
  remWrap: {
    marginBottom: 12,
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
  tip: {
    color: Nexus.textMuted,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
    marginBottom: 4,
  },
  board: {
    alignSelf: "center",
    borderWidth: 2,
    borderColor: Nexus.border,
    overflow: "hidden",
  },
  boardFrozen: { opacity: 0.45 },
  boardRow: { flexDirection: "row" },
  cellBase: { justifyContent: "center", alignItems: "center" },
  cellLight: { backgroundColor: "#f0d9b5" },
  cellDark: { backgroundColor: "#b58863" },
  cellSel: {
    borderWidth: 2,
    borderColor: Nexus.cyan,
  },
  cellHint: {
    backgroundColor: "rgba(0,255,136,0.42)",
  },
  piece: {
    fontFamily: "Georgia",
    fontWeight: "600",
    marginTop: 3,
  },
  pWht: { color: "#f8f8f8", textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pBlk: { color: "#0a0a0a", textShadowColor: "rgba(255,255,255,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  lab: {
    position: "absolute",
    bottom: 3,
    right: 4,
    fontSize: 8,
    color: "rgba(0,0,0,0.35)",
    fontWeight: "600",
  },
  p: { color: Nexus.textMuted, marginTop: 12 },
  e: { color: "#faa", marginBottom: 12 },
  link: { color: Nexus.cyan },
});
