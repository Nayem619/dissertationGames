/**
 * Async beat-my-score challenges — Firestore contract (dissertation demos).
 */

import { auth, db } from "@/constants/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const COL = "async_challenges";

export const CHALLENGE_KINDS = {
  runner_best: "runner_best",
  trivia_streak: "trivia_streak",
  arcade_flappy: "arcade_flappy",
  puzzle_ladder_stages: "puzzle_ladder_stages",
};

export async function publishAsyncChallenge(kind, issuerTag, metricValue, memo = "") {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in to issue a challenge.");
  const safeKind = CHALLENGE_KINDS[kind] ? kind : "runner_best";
  const mv =
    typeof metricValue === "number" && Number.isFinite(metricValue)
      ? metricValue
      : Number(metricValue);

  const ref = await addDoc(collection(db, COL), {
    issuerUid: user.uid,
    issuerTagClean: String(issuerTag || "player").slice(0, 64),
    kind: safeKind,
    targetMetric: mv,
    memo: String(memo || "").slice(0, 200),
    acceptedByUid: null,
    status: "open",
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getChallengeDoc(challengeId) {
  const s = await getDoc(doc(db, COL, challengeId));
  if (!s.exists) return null;
  return { id: s.id, ...s.data() };
}

export async function softAcceptChallenge(challengeId) {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in.");
  await updateDoc(doc(db, COL, challengeId), {
    acceptedByUid: user.uid,
    status: "attempted",
    acceptedAt: serverTimestamp(),
  });
}
