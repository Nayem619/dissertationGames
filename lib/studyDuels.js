/**
 * Blind pairwise duel invites — Firestore-backed (dissertation UX).
 */

import { auth, db } from "@/constants/firebase";
import { oppositeCohortLetter } from "@/lib/abExperiments";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

const COL = "study_duels";

function duelRef(id) {
  return doc(db, COL, id);
}

/** Challenger creates duel; challenger should host the networked room next. */
export async function createBlindStudyDuelInvite(gameChoice) {
  const u = auth.currentUser;
  if (!u?.uid) throw new Error("Sign in to start a duel.");
  const g = gameChoice === "chess" ? "chess" : "tictactoe";
  const challengerLetter = Math.random() < 0.5 ? "A" : "B";

  const created = await addDoc(collection(db, COL), {
    challengerUid: u.uid,
    game: g,
    challengerLetter,
    responderLetter: oppositeCohortLetter(challengerLetter),
    status: "open",
    roomCodeUpper: null,
    createdAt: serverTimestamp(),
  });

  return {
    duelId: created.id,
    challengerLetter,
    responderLetter: oppositeCohortLetter(challengerLetter),
  };
}

export async function getStudyDuel(inviteId) {
  const s = await getDoc(duelRef(inviteId));
  if (!s.exists) return null;
  return { id: s.id, ...s.data() };
}

/** Second participant locks responder slot (race may rarely fail — UX retry). */
export async function bindResponderToStudyDuel(inviteId) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in to join duel.");
  const ref = duelRef(inviteId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Invite expired or missing.");
    const d = snap.data();
    if (String(d.status || "") !== "open") throw new Error("No longer accepting joiners.");
    if (d.challengerUid === uid) throw new Error("Share this invite — you already created this duel.");
    if (d.responderUid && d.responderUid !== uid) throw new Error("Someone else already paired.");
    tx.update(ref, {
      responderUid: uid,
      status: "paired",
      pairedAt: serverTimestamp(),
    });
  });

  try {
    const paired = await getStudyDuel(inviteId);
    const rc = typeof paired?.roomCodeUpper === "string" ? paired.roomCodeUpper.trim() : "";
    if (rc) {
      const { refreshStudyDuelLabSeatForRoom } = await import("./multiplayerRooms");
      await refreshStudyDuelLabSeatForRoom(rc);
    }
  } catch {
    /* offline / race */
  }
}

export async function markStudyDuelRoom(inviteId, roomCodeUpper) {
  await updateDoc(duelRef(inviteId), {
    roomCodeUpper: roomCodeUpper.trim().toUpperCase(),
    status: "playing",
    playingAt: serverTimestamp(),
  });
  try {
    const { refreshStudyDuelLabSeatForRoom } = await import("./multiplayerRooms");
    await refreshStudyDuelLabSeatForRoom(roomCodeUpper);
  } catch {
    /* room may not have guest yet */
  }
}

export async function summarizeBlindRevealForUid(duel, uid) {
  if (!duel || !uid) return null;
  const letter =
    duel.challengerUid === uid
      ? duel.challengerLetter
      : duel.responderUid === uid
        ? duel.responderLetter
        : null;
  if (!letter) return null;
  const treatment = letter === "B";
  return {
    cohortLetter: letter,
    headline: treatment
      ? "You had the lab treatment UX (hints / undo)."
      : "You had the lab control UX (baseline board).",
    treatment,
    policy:
      letter === "B"
        ? "Treatment = chess destination highlights + staged TTT undo seat policy."
        : "Control = no highlight assists + classical TTT (no rewind).",
  };
}
