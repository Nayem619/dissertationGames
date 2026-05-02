/**
 * Dissertation/demo membership: three free launches per entitlement id, then paywall (£19.99/mo simulated).
 * Card data must never touch this module — ephemeral UI only on the checkout screen.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const MEMBERSHIP_PRICE_GBP = "£19.99";
export const MEMBERSHIP_INTERVAL = "per month";

export const FREE_LAUNCHES_PER_GAME = 3;

const STORAGE_VERSION = "nexus_membership_v2";

async function anonInstallKey() {
  const k = "nexus_membership_install_id";
  let v = await AsyncStorage.getItem(k);
  if (!v) {
    v = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
    await AsyncStorage.setItem(k, v);
  }
  return v;
}

export async function currentAccountKey(firebaseUid) {
  if (firebaseUid && typeof firebaseUid === "string") return `u:${firebaseUid}`;
  const anon = await anonInstallKey();
  return `a:${anon}`;
}

export const ENTITLEMENT_LABELS = {
  tictactoe: "Tic Tac Toe",
  trivia: "Trivia",
  snake: "Snake Arcade",
  arcade: "Phaser Arcade hub",
  online: "Online rooms",
  runner: "Endless Runner",
  rps: "Rock Paper Scissors",
};

async function mutateAccount(accountKey, fn) {
  const raw = await AsyncStorage.getItem(STORAGE_VERSION);
  /** @type {Record<string, any>} */
  const all = raw ? JSON.parse(raw) : {};
  const prev = all[accountKey] || {};
  const draft = {
    rounds: typeof prev.rounds === "object" && prev.rounds !== null ? { ...prev.rounds } : {},
    demo: !!prev.demo,
    demoUntil:
      typeof prev.demoUntil === "number" && Number.isFinite(prev.demoUntil)
        ? prev.demoUntil
        : null,
  };
  fn(draft);
  all[accountKey] = draft;
  await AsyncStorage.setItem(STORAGE_VERSION, JSON.stringify(all));
}

export async function loadMembershipState(accountKey) {
  const raw = await AsyncStorage.getItem(STORAGE_VERSION);
  const all = raw ? JSON.parse(raw) : {};
  const row = all[accountKey];
  const rounds =
    row && typeof row.rounds === "object" && row.rounds !== null ? { ...row.rounds } : {};
  const demoUntil =
    typeof row?.demoUntil === "number" && Number.isFinite(row.demoUntil) ? row.demoUntil : null;
  const demo = !!row?.demo;
  return { rounds, demoUntil, demo, demoRaw: demo };
}

export function isMembershipActiveLoaded(st) {
  const now = Date.now();
  return !!(st.demo && st.demoUntil && st.demoUntil > now);
}

/**
 * @returns {Promise<{ ok:true } | { ok:false, entitlementId:string }>}
 */
export async function consumeLaunch(entitlementId, accountKey) {
  const id = String(entitlementId || "").trim();
  if (!id) return { ok: false, entitlementId: "?" };

  const snap = await loadMembershipState(accountKey);
  if (isMembershipActiveLoaded(snap)) return { ok: true };

  const used = typeof snap.rounds[id] === "number" ? snap.rounds[id] : 0;
  if (used >= FREE_LAUNCHES_PER_GAME) return { ok: false, entitlementId: id };

  await mutateAccount(accountKey, (d) => {
    d.rounds[id] = used + 1;
  });
  return { ok: true };
}

export async function activateDemoMembership(accountKey) {
  const demoUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await mutateAccount(accountKey, (d) => {
    d.demo = true;
    d.demoUntil = demoUntil;
  });
  return { demoUntil };
}

export async function clearDemoMembership(accountKey) {
  await mutateAccount(accountKey, (d) => {
    d.demo = false;
    d.demoUntil = null;
  });
}

/** Dev helper */
export async function resetFreeRounds(accountKey) {
  await mutateAccount(accountKey, (d) => {
    d.rounds = {};
    d.demo = false;
    d.demoUntil = null;
  });
}

/** Read-only peek for UI */
export async function peek(entitlementId, accountKey) {
  const st = await loadMembershipState(accountKey);
  const id = String(entitlementId || "");
  if (isMembershipActiveLoaded(st))
    return {
      member: true,
      used: FREE_LAUNCHES_PER_GAME,
      remaining: FREE_LAUNCHES_PER_GAME,
    };
  const used = typeof st.rounds[id] === "number" ? st.rounds[id] : 0;
  return { member: false, used, remaining: Math.max(0, FREE_LAUNCHES_PER_GAME - used) };
}
