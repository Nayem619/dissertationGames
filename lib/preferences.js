import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@nexus_prefs_v1";

export const INITIAL_PREFS = {
  soundEffects: true,
  /** Reserved for native games — WebView CDN games ignore this */
  hapticsEnabled: true,
  largeUI: false,
  /** dissertation: null = unanswered, false = declined, true = opted in */
  analyticsConsent: null,
  /** A/B cohort label persisted once assigned */
  abVariant: null,
  /** Override shown name on leaderboards without changing Firebase profile */
  displayNameOverride: "",
  /** dissertation: opt-in to blind pairwise duel invite flow */
  studyDuelOptIn: false,
  seenTutorial: false,
};

export async function loadPreferences() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...INITIAL_PREFS };
    return { ...INITIAL_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...INITIAL_PREFS };
  }
}

export async function savePreferences(partial) {
  const cur = await loadPreferences();
  const next = { ...cur, ...partial };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
