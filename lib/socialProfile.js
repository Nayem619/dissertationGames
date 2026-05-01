/**
 * Public gamer tag (Firestore). Used for multiplayer identity, history, friends, search.
 * Deploy rules: users may read any public_profiles; write only own doc + corresponding username_registry.
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
  onSnapshot,
} from "firebase/firestore";

export const PROFILE_COL = "public_profiles";
export const USERNAME_REGISTRY = "username_registry";

export function sanitizeUsername(raw) {
  const s = String(raw || "").trim();
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  return lower.replace(/[^a-z0-9_]/g, "").slice(0, 18);
}

export function validateUsernameForClaim(canonicalLower) {
  if (canonicalLower.length < 3) throw new Error("Username must be at least 3 characters.");
  if (canonicalLower.length > 18) throw new Error("Username must be at most 18 characters.");
}

/** Display casing: capitalize segments after underscore */
export function toDisplayUsername(canonicalLower) {
  return canonicalLower
    .split("_")
    .map((seg) =>
      seg.length ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : ""
    )
    .filter(Boolean)
    .join("_") || canonicalLower;
}

export async function getPublicProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, PROFILE_COL, uid));
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export function subscribePublicProfile(uid, onData) {
  if (!uid) return () => {};
  return onSnapshot(doc(db, PROFILE_COL, uid), (snap) => {
    onData(snap.exists ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function usernameIsClaimed(lower) {
  const snap = await getDoc(doc(db, USERNAME_REGISTRY, lower));
  return !!snap.exists;
}

/**
 * Atomically reserves username for current user (replaces prior tag if caller already owned one).
 */
export async function claimUsername(rawInput) {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Sign in to choose a username.");
  const lower = sanitizeUsername(rawInput);
  validateUsernameForClaim(lower);
  const display = toDisplayUsername(lower);

  const regRef = doc(db, USERNAME_REGISTRY, lower);
  const profRef = doc(db, PROFILE_COL, user.uid);

  await runTransaction(db, async (tx) => {
    const regSnap = await tx.get(regRef);
    const profSnap = await tx.get(profRef);
    let oldLower = "";
    if (profSnap.exists) {
      const o = typeof profSnap.data()?.usernameLower === "string"
        ? profSnap.data().usernameLower.trim().toLowerCase()
        : "";
      if (o) oldLower = o;
    }

    if (regSnap.exists) {
      const owner = regSnap.data()?.uid;
      if (owner && owner !== user.uid) throw new Error("That username is already taken.");
    }

    if (oldLower && oldLower !== lower) {
      tx.delete(doc(db, USERNAME_REGISTRY, oldLower));
    }

    tx.set(regRef, { uid: user.uid }, { merge: true });
    tx.set(
      profRef,
      {
        username: display,
        usernameLower: lower,
        displayNameFallback: user.displayName || "",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function getUsernameLabels(uids) {
  const uniq = [...new Set((uids || []).filter(Boolean))];
  const rows = await Promise.all(uniq.map((u) => getPublicProfile(u)));
  const map = {};
  uniq.forEach((u, i) => {
    const p = rows[i];
    map[u] = p?.username || p?.usernameLower || p?.displayNameFallback || "Player";
  });
  return map;
}

/** Prefix search on usernameLower (requires rules allowing read collection). */
export async function searchUsersByUsernamePrefix(prefixRaw, max = 24) {
  const p = sanitizeUsername(prefixRaw);
  if (p.length < 2)
    throw new Error("Type at least 2 letters to search.");
  const qy = query(
    collection(db, PROFILE_COL),
    where("usernameLower", ">=", p),
    where("usernameLower", "<=", `${p}\uf8ff`),
    orderBy("usernameLower"),
    limit(max)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }));
}
