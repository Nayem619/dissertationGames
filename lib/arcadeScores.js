import { auth, db } from "@/constants/firebase";
import * as Haptics from "expo-haptics";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { logResearchEvent } from "@/lib/dissertation";
import { loadPreferences } from "@/lib/preferences";
import { getISOWeekKey } from "@/lib/weekKey";

/** game id must match Firestore leaderboard filter e.g. arcade_breakout */
export async function submitArcadeScore(game, scoreValue, extras = {}) {
  const num = typeof scoreValue === "number" ? scoreValue : parseInt(scoreValue, 10);
  if (!Number.isFinite(num) || num < 0) return;

  try {
    const user = auth.currentUser;
    if (!user?.uid) {
      console.log("Arcade score not saved — not signed in");
      return;
    }

    const prefs = await loadPreferences();
    const player =
      (prefs.displayNameOverride && prefs.displayNameOverride.trim()) ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "Player";

    if (prefs.hapticsEnabled !== false) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (_) {}
    }

    await addDoc(collection(db, "scores"), {
      player,
      game,
      score: num,
      userId: user.uid,
      createdAt: serverTimestamp(),
      weekKey: getISOWeekKey(),
      difficulty: extras.difficulty ?? "standard",
      ...extras,
    });

    void logResearchEvent("arcade_score", { game, score: num });
  } catch (e) {
    console.warn("submitArcadeScore", e);
  }
}
