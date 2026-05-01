/**
 * Lightweight Firestore rooms for synced multiplayer (Tic-Tac-Toe, chess).
 */

import { Chess, DEFAULT_POSITION } from "@/lib/third_party/chess.esm";

import { auth, db } from "@/constants/firebase";
import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { getPublicProfile } from "@/lib/socialProfile";
import { getStudyDuel } from "@/lib/studyDuels";

async function hostGamertagHint() {
  const u = auth.currentUser;
  if (!u?.uid) return "";
  try {
    const p = await getPublicProfile(u.uid);
    return (p?.username || p?.usernameLower || "").trim();
  } catch {
    return "";
  }
}

function touchPresence(uid, d) {
  const isHost = d.hostUid === uid;
  if (isHost)
    return { hostLastActiveAt: serverTimestamp(), lastActivityAt: serverTimestamp() };
  return { guestLastActiveAt: serverTimestamp(), lastActivityAt: serverTimestamp() };
}

const COL = "multiplayer_rooms";

function ref(code) {
  return doc(db, COL, code);
}

/** After responder pairs (or re-reads duel), apply B-seat treatment mapping to the room if both players are seated. */
export async function refreshStudyDuelLabSeatForRoom(roomCodeUpper) {
  const code = roomCodeUpper.trim().toUpperCase();
  const snap = await getDoc(ref(code));
  if (!snap.exists) return;
  const d = snap.data();
  const duelId = typeof d.studyDuelId === "string" ? d.studyDuelId.trim() : "";
  if (!duelId || !d.guestUid || !d.hostUid) return;
  const duel = await getStudyDuel(duelId);
  if (!duel || !duel.responderUid) return;
  const treatUid =
    duel.challengerLetter === "B" ? duel.challengerUid : duel.responderUid;
  const next = treatUid || null;
  if (d.labTreatmentSeatUid === next) return;
  await updateDoc(ref(code), {
    labTreatmentSeatUid: next,
    updatedAt: serverTimestamp(),
  });
}

const SYMBOLS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode() {
  let s = "";
  for (let i = 0; i < 6; i++)
    s += SYMBOLS.charAt(Math.floor(Math.random() * SYMBOLS.length));
  return s;
}

export async function hostChessRoom(hostOpts = {}) {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in to host.");
  let code = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const snap = await getDoc(ref(code));
    if (!snap.exists) break;
    code = generateRoomCode();
  }
  const tag = await hostGamertagHint();
  const duelId = typeof hostOpts.studyDuelId === "string" ? hostOpts.studyDuelId.trim() : "";
  await setDoc(ref(code), {
    game: "chess",
    fen: DEFAULT_POSITION,
    hostUid: user.uid,
    guestUid: null,
    result: null,
    sessionSeq: 1,
    historyLoggedForSeq: null,
    hostUsername: tag || null,
    guestUsername: null,
    hostLastActiveAt: serverTimestamp(),
    expChessLegalHints: !!hostOpts.expChessLegalHints,
    expTttUndo: !!hostOpts.expTttUndo,
    studyDuelId: duelId || null,
    labTreatmentSeatUid: null,
    undoStaging: null,
    undoHostConsumed: false,
    undoGuestConsumed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return code;
}

export async function hostTicTacToeRoom(hostOpts = {}) {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in to host.");
  let code = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const snap = await getDoc(ref(code));
    if (!snap.exists) break;
    code = generateRoomCode();
  }
  const tag = await hostGamertagHint();
  const duelId = typeof hostOpts.studyDuelId === "string" ? hostOpts.studyDuelId.trim() : "";
  await setDoc(ref(code), {
    game: "tictactoe",
    board: "         ",
    turnMark: "X",
    hostUid: user.uid,
    guestUid: null,
    winner: null,
    sessionSeq: 1,
    historyLoggedForSeq: null,
    hostUsername: tag || null,
    guestUsername: null,
    hostLastActiveAt: serverTimestamp(),
    expChessLegalHints: !!hostOpts.expChessLegalHints,
    expTttUndo: !!hostOpts.expTttUndo,
    studyDuelId: duelId || null,
    labTreatmentSeatUid: null,
    undoStaging: null,
    undoHostConsumed: false,
    undoGuestConsumed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return code;
}

export async function joinRoomAsGuest(roomCode) {
  const code = roomCode.trim().toUpperCase();
  const snap = await getDoc(ref(code));
  if (!snap.exists) throw new Error("Room not found");
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in to join.");

  const d = snap.data();
  if (
    !d.guestUid &&
    typeof d.participantLeftUid === "string" &&
    d.participantLeftUid
  )
    throw new Error("That lobby was closed — get a fresh room code from your friend.");
  if (d.hostUid === user.uid) return code;
  if (!d.guestUid) {
    const gp = await getPublicProfile(user.uid);
    const gtag = String(
      gp?.username || gp?.usernameLower || gp?.displayNameFallback || ""
    ).trim();
    await updateDoc(ref(code), {
      guestUid: user.uid,
      guestUsername: gtag || null,
      guestLastActiveAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (d.guestUid !== user.uid) {
    throw new Error("This room already has two players — ask for a new room code.");
  }

  await refreshStudyDuelLabSeatForRoom(code);

  return code;
}

export function subscribeRoom(roomCode, onData) {
  const c = roomCode.trim().toUpperCase();
  return onSnapshot(ref(c), (snap) => {
    onData(snap.exists ? snap.data() : null);
  });
}

/** Call when exiting the match UI (Back / swipe away). Signals the other player's client to stop waiting. */
export async function notifyParticipantLeft(roomCode, uid) {
  if (!uid) return;
  const code = roomCode.trim().toUpperCase();
  try {
    const snap = await getDoc(ref(code));
    if (!snap.exists) return;
    const d = snap.data();
    if (d.hostUid !== uid && d.guestUid !== uid) return;
    await updateDoc(ref(code), {
      participantLeftUid: uid,
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* offline / torn room */
  }
}

/** Resolves the room's `game` field (defaults to tictactoe). Returns null if doc missing. */
export async function peekRoomGame(roomCode) {
  const snap = await getDoc(ref(roomCode.trim().toUpperCase()));
  if (!snap.exists) return null;
  return String(snap.data()?.game ?? "tictactoe");
}

export function winnerFromBoard(str) {
  const b = str || "         ";
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, bb, c] = lines[i];
    const tri = b[a] + b[bb] + b[c];
    if (tri === "XXX" || tri === "OOO") return tri[0];
  }
  if (!b.includes(" ")) return "Draw";
  return null;
}

export async function markCell(roomCode, index, uid) {
  if (index < 0 || index > 8) return;
  const code = roomCode.trim().toUpperCase();
  const snap = await getDoc(ref(code));
  if (!snap.exists) throw new Error("Room is no longer available.");
  const d = snap.data();
  const g = String(d.game || "tictactoe");
  if (g !== "tictactoe") throw new Error("This room is chess — open the chess board.");
  const isHost = d.hostUid === uid;
  const isGuest = d.guestUid === uid;
  if (!isHost && !isGuest) throw new Error("You are not a player in this room.");
  if (!d.guestUid) throw new Error("Still waiting for someone to join.");
  if (typeof d.participantLeftUid === "string" && d.participantLeftUid)
    throw new Error("They left — this match ended.");
  if (d.winner) throw new Error("Game is already over.");

  const myMark = isHost ? "X" : "O";
  let boardStr = typeof d.board === "string" ? d.board : "         ";
  if (boardStr.length !== 9) boardStr = "         ";

  const turnOk = (d.turnMark || "X") === myMark;
  if (!turnOk) throw new Error("Wait — opponent's turn.");

  const arr = boardStr.split("");
  if (arr[index] !== " ") throw new Error("That square is taken.");

  const boardBeforeMove = boardStr;
  const oppClearStaging = !!(d.undoStaging?.moverUid && d.undoStaging.moverUid !== uid);

  arr[index] = myMark;
  boardStr = arr.join("");
  const w = winnerFromBoard(boardStr);
  const presence = touchPresence(uid, d);

  const undoSeatAllowed = (() => {
    const seat = typeof d.labTreatmentSeatUid === "string" ? d.labTreatmentSeatUid.trim() : "";
    if (seat) return seat === uid;
    return !!d.expTttUndo;
  })();

  let stagingField = deleteField();
  if (!w && undoSeatAllowed) {
    if (oppClearStaging || !d.undoStaging) {
      stagingField = {
        boardPrev: boardBeforeMove,
        turnPrev: d.turnMark || "X",
        winnerPrev: d.winner ?? null,
        moverUid: uid,
      };
    }
  }

  await updateDoc(ref(code), {
    board: boardStr,
    turnMark: myMark === "X" ? "O" : "X",
    winner: w === "Draw" ? "Draw" : w || null,
    undoStaging: stagingField,
    ...presence,
    updatedAt: serverTimestamp(),
  });
}

/** Consume staged undo once per seat (lab treatment UX). */
export async function consumeUndoTTT(roomCode, uid) {
  const code = roomCode.trim().toUpperCase();
  const snap = await getDoc(ref(code));
  if (!snap.exists) throw new Error("Room unavailable.");
  const d = snap.data();
  const g = String(d.game || "tictactoe");
  if (g !== "tictactoe") throw new Error("Undo is for TTT rooms only.");
  if (!d.guestUid) throw new Error("Still waiting.");
  if (typeof d.participantLeftUid === "string" && d.participantLeftUid)
    throw new Error("Match ended.");

  const st = d.undoStaging || null;
  if (!st?.moverUid || st.moverUid !== uid) throw new Error("Nothing to undo right now.");

  const undoSeatAllowed = (() => {
    const seat = typeof d.labTreatmentSeatUid === "string" ? d.labTreatmentSeatUid.trim() : "";
    if (seat) return seat === uid;
    return !!d.expTttUndo;
  })();
  if (!undoSeatAllowed) throw new Error("Undo disabled for this lobby.");

  const isHost = d.hostUid === uid;
  if (isHost && d.undoHostConsumed) throw new Error("Undo already spent.");
  if (!isHost && d.undoGuestConsumed) throw new Error("Undo already spent.");
  if (d.winner) throw new Error("Game over — rewind locked.");

  const prevBoard =
    typeof st.boardPrev === "string" && st.boardPrev.length === 9
      ? st.boardPrev
      : "         ";
  const prevTurn =
    typeof st.turnPrev === "string" ? st.turnPrev : "X";

  await updateDoc(ref(code), {
    board: prevBoard,
    turnMark: prevTurn,
    winner:
      typeof st.winnerPrev === "string"
        ? st.winnerPrev
        : null,
    undoStaging: deleteField(),
    undoHostConsumed: isHost ? true : !!d.undoHostConsumed,
    undoGuestConsumed: !isHost ? true : !!d.undoGuestConsumed,
    updatedAt: serverTimestamp(),
    ...touchPresence(uid, d),
  });
}

/** Apply a half-move (from/to algebraic squares, auto-queen promotion). */
export async function applyChessMove(roomCode, uid, fromSquare, toSquare) {
  const from = String(fromSquare || "").toLowerCase().trim();
  const to = String(toSquare || "").toLowerCase().trim();
  if (from.length !== 2 || to.length !== 2) throw new Error("Bad square");
  const code = roomCode.trim().toUpperCase();
  const snap = await getDoc(ref(code));
  if (!snap.exists) throw new Error("Room is no longer available.");
  const d = snap.data();
  if ((d.game || "") !== "chess") throw new Error("This room is Tic‑Tac‑Toe — open that board instead.");
  const isHost = d.hostUid === uid;
  const isGuest = d.guestUid === uid;
  if (!isHost && !isGuest) throw new Error("You are not a player in this room.");
  if (!d.guestUid) throw new Error("Still waiting for someone to join.");
  if (typeof d.participantLeftUid === "string" && d.participantLeftUid)
    throw new Error("They left — this match ended.");
  if (d.result) throw new Error("Game is already over.");

  const game = new Chess(typeof d.fen === "string" ? d.fen : DEFAULT_POSITION);
  const tc = game.turn();
  if (isHost && tc !== "w") throw new Error("Wait — Black to move.");
  if (isGuest && tc !== "b") throw new Error("Wait — White to move.");

  const ok =
    game.move({ from, to, promotion: "q" }) ||
    game.move({ from, to }) ||
    null;
  if (!ok) throw new Error("That move is not allowed.");

  let result =
    typeof d.result === "string"
      ? d.result
      : null;
  if (!result && game.isGameOver()) {
    if (game.isCheckmate()) {
      const loser = game.turn();
      result = loser === "w" ? "b" : "w";
    } else result = "draw";
  }

  const presence = touchPresence(uid, d);
  await updateDoc(ref(code), {
    fen: game.fen(),
    result,
    ...presence,
    updatedAt: serverTimestamp(),
  });
}

/** True when the other seated player signalled they left the match (Firestore `participantLeftUid`). */
export function opponentVacatedMatch(data, myUid) {
  if (!data || !myUid) return false;
  const left = typeof data.participantLeftUid === "string" ? data.participantLeftUid.trim() : "";
  if (!left || left === myUid) return false;
  if (!data.hostUid || !data.guestUid) return false;
  return left === data.hostUid || left === data.guestUid;
}

/** Both players must vote true to reset the same room for another game. */
export async function castRematchVote(roomCode, uid) {
  if (!uid) return;
  const code = roomCode.trim().toUpperCase();
  await updateDoc(ref(code), {
    [`rematchVotes.${uid}`]: true,
    updatedAt: serverTimestamp(),
  });
}

/** Run when snapshot shows two rematch votes; clears game state and bumps sessionSeq. */
export async function tryCommitRematchReset(roomCode) {
  const code = roomCode.trim().toUpperCase();
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(code));
    if (!snap.exists) return;
    const d = snap.data();
    const hv = d.hostUid;
    const gv = d.guestUid;
    const votes = d.rematchVotes || {};
    if (!hv || !gv || !votes[hv] || !votes[gv]) return;
    const seq = Number(d.sessionSeq ?? 1);
    const game = String(d.game || "tictactoe");
    const common = {
      sessionSeq: seq + 1,
      historyLoggedForSeq: null,
      rematchVotes: deleteField(),
      participantLeftUid: deleteField(),
      undoStaging: deleteField(),
      undoHostConsumed: false,
      undoGuestConsumed: false,
      hostLastActiveAt: serverTimestamp(),
      guestLastActiveAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (game === "chess") {
      tx.update(ref(code), {
        ...common,
        fen: DEFAULT_POSITION,
        result: null,
      });
      return;
    }
    tx.update(ref(code), {
      ...common,
      board: "         ",
      turnMark: "X",
      winner: null,
    });
  });
}

/** Milliseconds since the other player touched the room (move / join). Null if unknown. */
export function millisSinceOtherMoved(data, myUid) {
  if (!data?.hostUid || !data?.guestUid || !myUid) return null;
  const isHost = data.hostUid === myUid;
  const ts = isHost ? data.guestLastActiveAt : data.hostLastActiveAt;
  if (!ts || typeof ts.toMillis !== "function") return null;
  return Date.now() - ts.toMillis();
}

export function seatGetsChessLegalHints(roomData, uid) {
  if (!roomData || !uid) return false;
  const seat = typeof roomData.labTreatmentSeatUid === "string" ? roomData.labTreatmentSeatUid.trim() : "";
  if (seat) return seat === uid;
  return !!roomData.expChessLegalHints;
}

export function seatGetsTttUndo(roomData, uid) {
  if (!roomData || !uid) return false;
  const seat = typeof roomData.labTreatmentSeatUid === "string" ? roomData.labTreatmentSeatUid.trim() : "";
  if (seat) return seat === uid;
  return !!roomData.expTttUndo;
}

