/**
 * Live messages under a multiplayer room: multiplayer_rooms/{code}/messages
 * Deploy Firestore rules that allow read/create only for hostUid/guestUid on the parent room.
 */

import { auth, db } from "@/constants/firebase";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getPublicProfile } from "@/lib/socialProfile";

const ROOMS = "multiplayer_rooms";
const MESSAGES = "messages";
const MAX_LEN = 280;
const MAX_FETCH = 120;

function messagesCol(code) {
  return collection(db, ROOMS, code.trim().toUpperCase(), MESSAGES);
}

export function subscribeRoomMessages(roomCode, onList) {
  const c = roomCode.trim().toUpperCase();
  const q = query(messagesCol(c), orderBy("createdAt", "asc"), limit(MAX_FETCH));
  return onSnapshot(
    q,
    (snap) => {
      onList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    () => onList([])
  );
}

export async function sendRoomMessage(roomCode, text) {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in to chat");
  const t = String(text || "").trim();
  if (!t) throw new Error("Empty message");
  if (t.length > MAX_LEN) throw new Error(`Max ${MAX_LEN} characters`);
  const code = roomCode.trim().toUpperCase();
  const prof = await getPublicProfile(user.uid);
  const name =
    String(
      prof?.username ||
        prof?.usernameLower ||
        user.displayName ||
        (user.email && user.email.split("@")[0]) ||
        "Player"
    ).slice(0, 80);
  await addDoc(messagesCol(code), {
    text: t,
    senderUid: user.uid,
    senderName: name.slice(0, 80),
    createdAt: serverTimestamp(),
  });
}
