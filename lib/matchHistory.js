/**
 * Persist completed online-room sessions (Firestore `online_matches`).
 * Dedup via room.sessionSeq ↔ historyLoggedForSeq in a transaction.
 */

import { auth, db } from "@/constants/firebase";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

import { getUsernameLabels } from "@/lib/socialProfile";

const ROOM_COL = "multiplayer_rooms";
export const ONLINE_MATCH_COL = "online_matches";

function roomDocRef(roomCode) {
  return doc(db, ROOM_COL, roomCode.trim().toUpperCase());
}

function isOpponentAbandon(d) {
  const left =
    typeof d.participantLeftUid === "string" ? d.participantLeftUid.trim() : "";
  if (!left || !d.hostUid || !d.guestUid) return false;
  return left === d.hostUid || left === d.guestUid;
}

function classifyTerminal(room) {
  const d = room || {};
  const game = String(d.game || "tictactoe");
  if (!d.hostUid || !d.guestUid) return null;

  if (game === "tictactoe") {
    const w = d.winner;
    if (w === "Draw") {
      return {
        summary: "Draw · Tic‑Tac‑Toe",
        outcome: "draw",
        winnerUid: null,
        leftUid: null,
      };
    }
    if (w === "X" || w === "O") {
      const winnerUid = w === "X" ? d.hostUid : d.guestUid;
      return {
        summary: `Win · Tic‑Tac‑Toe · ${w} wins`,
        outcome: "win",
        winnerUid,
        leftUid: null,
      };
    }
    if (isOpponentAbandon(d)) {
      const left = d.participantLeftUid.trim();
      const stay = left === d.hostUid ? d.guestUid : d.hostUid;
      return {
        summary: "You win — opponent left mid-match.",
        outcome: "abandon",
        winnerUid: stay,
        leftUid: left,
      };
    }
    return null;
  }

  if (game === "chess") {
    const r = typeof d.result === "string" ? d.result : null;
    if (r === "draw") {
      return { summary: "Draw · chess", outcome: "draw", winnerUid: null, leftUid: null };
    }
    if (r === "w" || r === "b") {
      const winnerUid = r === "w" ? d.hostUid : d.guestUid;
      return {
        summary: "Win · chess",
        outcome: "win",
        winnerUid,
        leftUid: null,
      };
    }
    if (isOpponentAbandon(d)) {
      const left = d.participantLeftUid.trim();
      const stay = left === d.hostUid ? d.guestUid : d.hostUid;
      return {
        summary: "You win — opponent left mid-match.",
        outcome: "abandon",
        winnerUid: stay,
        leftUid: left,
      };
    }
    return null;
  }

  return null;
}

/** Call when room snapshot shows a terminal state. Idempotent client-side thanks to seq. */
export async function tryCommitTerminalMatchRecord(roomCode) {
  const code = roomCode.trim().toUpperCase();
  const rref = roomDocRef(code);

  const snap = await getDoc(rref);
  if (!snap.exists) return "skip";
  const d0 = snap.data();
  const seq0 = Number(d0.sessionSeq ?? 1);
  if (d0.historyLoggedForSeq === seq0) return "duplicate";

  const terminal0 = classifyTerminal(d0);
  if (!terminal0) return "skip";

  const names = await getUsernameLabels([d0.hostUid, d0.guestUid]);
  const hostName = names[d0.hostUid] || "Host";
  const guestName = names[d0.guestUid] || "Guest";

  let outcome = "skip";
  await runTransaction(db, async (tx) => {
    const s2 = await tx.get(rref);
    if (!s2.exists) return;
    const d = s2.data();
    const seq = Number(d.sessionSeq ?? 1);
    if (seq !== seq0 || d.historyLoggedForSeq === seq) return;

    const terminal = classifyTerminal(d);
    if (!terminal) return;

    const matchId = `${code}_${seq}`;
    const mref = doc(db, ONLINE_MATCH_COL, matchId);
    tx.set(mref, {
      roomCode: code,
      sessionSeq: seq,
      game: String(d.game || "tictactoe"),
      hostUid: d.hostUid,
      guestUid: d.guestUid,
      participantUids: [d.hostUid, d.guestUid],
      participantNames: { [d.hostUid]: hostName, [d.guestUid]: guestName },
      outcome: terminal.outcome,
      winnerUid: terminal.winnerUid || null,
      leftUid: terminal.leftUid || null,
      summary: terminal.summary,
      finishedAt: serverTimestamp(),
    });

    tx.update(rref, {
      historyLoggedForSeq: seq,
      updatedAt: serverTimestamp(),
    });
    outcome = "logged";
  });

  return outcome;
}

export async function listMyRecentMatches(limitN = 40) {
  const user = auth.currentUser?.uid;
  if (!user) return [];
  const qy = query(
    collection(db, ONLINE_MATCH_COL),
    where("participantUids", "array-contains", user),
    orderBy("finishedAt", "desc"),
    limit(limitN)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
}

export async function listUserRecentMatches(uid, limitN = 30) {
  if (!uid) return [];
  const qy = query(
    collection(db, ONLINE_MATCH_COL),
    where("participantUids", "array-contains", uid),
    orderBy("finishedAt", "desc"),
    limit(limitN)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
}
