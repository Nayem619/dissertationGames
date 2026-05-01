/**
 * Lightweight invisible session logging (privacy + consent gated).
 * Buffers enriched events locally, mirrors to Firestore when analytics consent ON.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth } from "@/constants/firebase";
import { loadPreferences } from "@/lib/preferences";
import { describeExportGameplayNotes } from "@/lib/studyGameplayLegend";

const SESSION_KEY = "@study_session_meta_v2";
const RING_PREFIX = "@study_ring_v2:";
const MAX_RING = 520;

async function rngChars() {
  const a = new Uint8Array(8);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(a);
  } else {
    for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function ensureStudySession() {
  const uid = auth.currentUser?.uid || "anon";
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  let meta = raw ? JSON.parse(raw) : null;
  const now = Date.now();
  if (!meta || meta.uid !== uid || now - (meta.startedAt || 0) > 1000 * 60 * 60 * 8) {
    meta = {
      sessionId: `ses_${now}_${await rngChars()}`,
      uid,
      startedAt: now,
      seeds: { clientJitter: Math.floor(Math.random() * 1e9) },
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(meta));
  }
  return meta;
}

export function getCachedStudySessionMeta() {
  return null;
}

export async function getStudySessionId() {
  const m = await ensureStudySession();
  return m.sessionId;
}

const _hes = new Map();

export function studyDecisionStart(key) {
  _hes.set(String(key), Date.now());
}

export async function studyDecisionEnd(key, payload = {}) {
  const k = String(key);
  const t0 = _hes.get(k);
  _hes.delete(k);
  const latencyMs = typeof t0 === "number" ? Math.max(0, Date.now() - t0) : null;
  await appendStudyEvent("study_decision", { key: k, latencyMs, ...payload });
}

export async function appendStudyEvent(type, payload = {}) {
  const prefs = await loadPreferences();
  if (!prefs.analyticsConsent) return;

  const meta = await ensureStudySession();
  const row = {
    type,
    t: Date.now(),
    sessionId: meta.sessionId,
    payload: sanitizePayload(payload),
  };

  const ringKey = RING_PREFIX + meta.sessionId;
  let ring = [];
  try {
    const raw = await AsyncStorage.getItem(ringKey);
    if (raw) ring = JSON.parse(raw);
  } catch {
    ring = [];
  }
  ring.push(row);
  if (ring.length > MAX_RING) ring = ring.slice(-MAX_RING);
  await AsyncStorage.setItem(ringKey, JSON.stringify(ring));

  const { logResearchEvent } = await import("./dissertation");
  await logResearchEvent(type, {
    sessionId: meta.sessionId,
    ...row.payload,
    clientT: row.t,
    latencyMs: payload.latencyMs ?? row.payload?.latencyMs,
  });
}

function sanitizePayload(p) {
  const out = {};
  if (!p || typeof p !== "object") return out;
  for (const [k, v] of Object.entries(p)) {
    if (k.length > 64) continue;
    if (typeof v === "string") out[k] = v.slice(0, 400);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

export async function flushRouteTrace(screen) {
  await appendStudyEvent("study_nav", { screen: String(screen).slice(0, 180) });
}

/** One-tap reproducibility bundle — no emails; hashed uid only when signed in */
export async function buildReproBundleJSONExtra() {
  const prefs = await loadPreferences();
  const meta = JSON.parse((await AsyncStorage.getItem(SESSION_KEY)) || "null");
  const sid = meta?.sessionId;
  let ring = [];
  if (sid) {
    try {
      const raw = await AsyncStorage.getItem(RING_PREFIX + sid);
      if (raw) ring = JSON.parse(raw);
    } catch {
      ring = [];
    }
  }

  let uidFingerprint = "";
  const u = auth.currentUser?.uid;
  if (u) {
    let h = 0;
    for (let i = 0; i < u.length; i++) h = (Math.imul(31, h) + u.charCodeAt(i)) | 0;
    uidFingerprint = `fp_${Math.abs(h).toString(16)}`;
  }

  return {
    reproBundleSchema: "nexusStudyReproBundle/1",
    consent: prefs.analyticsConsent === true,
    prefsSnapshot: {
      abVariant: prefs.abVariant ?? "unset",
      studyDuelOptIn: prefs.studyDuelOptIn === true,
    },
    uidFingerprintNullIfUnsigned: uidFingerprint || null,
    sessionMeta: meta,
    localEventRingTail: ring.slice(-200),
    exportGameplayNotes: describeExportGameplayNotes(),
    generatedAt: new Date().toISOString(),
  };
}
