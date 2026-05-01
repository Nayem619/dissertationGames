/** Static export legend for thesis JSON — avoids circular dissertation ↔ study imports. */

export function describeExportGameplayNotes() {
  return {
    schemaVersion: 1,
    cohortMeaning:
      "Letter A denotes control multiplayer UX · letter B activates treatment overlays when mirrored into multiplayer_rooms.exp* fields.",
    treatmentFlags:
      "Chess: legal destination previews when allowed. Tic‑Tac‑Toe: staged single rewind per seated player.",
    pairwiseDuel:
      "Firestore study_duels pairs opposite cohort letters without on-screen labeling until duel summary UI; labTreatmentSeatUid marks UX recipient.",
    puzzles:
      "Native Dissertation ladder rotates flow / pipe / ice; solo routes log PUZZLE_SOLO_METRIC · ladder wins also emit PUZZLE_LADDER for export. Cohort B enables one lab redo per stage on these surfaces.",
  };
}
