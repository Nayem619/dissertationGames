import { auth, db } from "@/constants/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  onSnapshot,
} from "firebase/firestore";

import { getUsernameLabels } from "@/lib/socialProfile";

const REQUESTS = "friend_requests";
const PAIRS = "friends_pairs";

export function sortedPairMembers(a, b) {
  return a < b ? [a, b] : [b, a];
}

export function friendsPairDocId(uidA, uidB) {
  const [x, y] = sortedPairMembers(uidA, uidB);
  return `${x}_${y}`;
}

/** Directional doc id — from invites to recipient. */
function requestDocId(fromUid, toUid) {
  return `${fromUid}_${toUid}`;
}

export async function sendFriendRequest(toUid) {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in to add friends.");
  const fromUid = user.uid;
  if (fromUid === toUid) throw new Error("Cannot add yourself.");

  const pairRef = doc(db, PAIRS, friendsPairDocId(fromUid, toUid));
  const pairSnap = await getDoc(pairRef);
  if (pairSnap.exists) throw new Error("You are already friends.");

  const outId = requestDocId(fromUid, toUid);
  const outRef = doc(db, REQUESTS, outId);
  const outSnap = await getDoc(outRef);
  if (outSnap.exists) throw new Error("Invite already pending.");

  const revId = requestDocId(toUid, fromUid);
  const revSnap = await getDoc(doc(db, REQUESTS, revId));
  if (revSnap.exists)
    throw new Error("They already invited you — open Friends / incoming to accept.");

  await setDoc(outRef, {
    fromUid,
    toUid,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(fromUid) {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in required.");
  const toUid = user.uid;
  const reqRef = doc(db, REQUESTS, requestDocId(fromUid, toUid));

  await runTransaction(db, async (tx) => {
    const r = await tx.get(reqRef);
    if (!r.exists) throw new Error("That invite is gone.");
    const d = r.data();
    if (d.toUid !== toUid || d.fromUid !== fromUid) throw new Error("Invalid invite.");
    const pairRef = doc(db, PAIRS, friendsPairDocId(fromUid, toUid));
    const [m0, m1] = sortedPairMembers(fromUid, toUid);
    tx.set(pairRef, { members: [m0, m1], since: serverTimestamp() });
    tx.delete(reqRef);
  });
}

export async function rejectFriendRequest(fromUid) {
  const user = auth.currentUser;
  if (!user?.uid) return;
  await deleteDoc(doc(db, REQUESTS, requestDocId(fromUid, user.uid)));
}

export async function revokeOutgoingRequest(toUid) {
  const user = auth.currentUser;
  if (!user?.uid) return;
  await deleteDoc(doc(db, REQUESTS, requestDocId(user.uid, toUid)));
}

export async function listFriendsDetailed() {
  const user = auth.currentUser;
  if (!user?.uid) return [];
  const qy = query(
    collection(db, PAIRS),
    where("members", "array-contains", user.uid)
  );
  const snap = await getDocs(qy);
  const buddies = [];
  for (let i = 0; i < snap.docs.length; i++) {
    const d = snap.docs[i];
    const m = d.data()?.members || [];
    const buddy = m.find((u) => u !== user.uid) || "";
    if (buddy) buddies.push({ pairId: d.id, uid: buddy });
  }
  const labels = await getUsernameLabels(buddies.map((b) => b.uid));
  return buddies.map((b) => ({
    ...b,
    username: labels[b.uid] || b.uid.slice(0, 8),
  }));
}

export function subscribeIncomingRequests(onList) {
  const user = auth.currentUser?.uid;
  if (!user) return () => {};
  const qy = query(collection(db, REQUESTS), where("toUid", "==", user));
  return onSnapshot(qy, async (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const fromUids = rows.map((r) => r.fromUid).filter(Boolean);
    const labels = await getUsernameLabels(fromUids);
    onList(
      rows
        .filter((r) => !r.status || r.status === "pending")
        .map((r) => ({
          ...r,
          fromUsername:
            labels[r.fromUid] || String(r.fromUid || "").slice(0, 8),
        }))
    );
  });
}

export async function outgoingPendingFor(uidB) {
  const user = auth.currentUser?.uid;
  if (!user) return false;
  const sid = requestDocId(user, uidB);
  const snap = await getDoc(doc(db, REQUESTS, sid));
  return !!snap.exists;
}

export async function areFriends(uidA, uidB) {
  if (!uidA || !uidB || uidA === uidB) return false;
  const snap = await getDoc(doc(db, PAIRS, friendsPairDocId(uidA, uidB)));
  return snap.exists;
}
