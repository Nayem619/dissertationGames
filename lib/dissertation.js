/**
 * Lightweight research instrumentation (Firestore).
 * Writes only when user has opted in via Settings / consent modal.
 */

import { auth, db } from "@/constants/firebase";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";

import { ONLINE_MATCH_COL } from "@/lib/matchHistory";
import { describeExportGameplayNotes } from "@/lib/studyGameplayLegend";
import { getISOWeekKey } from "./weekKey";

export { describeExportGameplayNotes };
export async function logResearchEvent(type, payload = {}) {
  const user = auth.currentUser;
  if (!user?.uid) return null;
  const { loadPreferences } = await import("./preferences");
  const prefs = await loadPreferences();
  if (!prefs.analyticsConsent) return null;

  try {
    const snap = await addDoc(collection(db, "research_events"), {
      uid: user.uid,
      variant: prefs.abVariant ?? "unset",
      type,
      weekKey: getISOWeekKey(),
      payload,
      createdAt: serverTimestamp(),
    });
    return snap?.id ?? null;
  } catch (e) {
    console.warn("logResearchEvent", e);
    return null;
  }
}

/** Assign stable A/B cohort from uid hash once */
export async function ensureAbVariant() {
  const { loadPreferences, savePreferences } = await import("./preferences");
  const prefs = await loadPreferences();
  if (prefs.abVariant) return prefs.abVariant;
  const uid = auth.currentUser?.uid || `anon_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < uid.length; i++)
    hash = (Math.imul(31, hash) + uid.charCodeAt(i)) | 0;
  const v = Math.abs(hash) % 2 === 0 ? "A" : "B";
  await savePreferences({ abVariant: v });
  return v;
}

/** Export aggregated raw rows tied to uid (scores + consent-gated events). Returns JSON string. */
export async function exportMyStudyDataJSON() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required");

  const { loadPreferences } = await import("./preferences");
  const prefs = await loadPreferences();

  const scoresQ = query(collection(db, "scores"), where("userId", "==", user.uid));
  const scoreSnap = await getDocs(scoresQ);
  const scores = scoreSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let events = [];
  if (prefs.analyticsConsent) {
    const evQ = query(collection(db, "research_events"), where("uid", "==", user.uid));
    const evSnap = await getDocs(evQ);
    events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const matchesQ = query(
    collection(db, ONLINE_MATCH_COL),
    where("participantUids", "array-contains", user.uid)
  );
  const matchSnap = await getDocs(matchesQ);
  const online_matches = matchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let reproBundle = null;
  try {
    const mod = await import("./studySession");
    reproBundle = await mod.buildReproBundleJSONExtra();
  } catch {
    reproBundle = null;
  }

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      userId: user.uid,
      gameplayInterpretation: describeExportGameplayNotes(),
      scores,
      online_matches,
      research_events: events,
      repro_bundle: reproBundle,
    },
    null,
    2
  );
}
