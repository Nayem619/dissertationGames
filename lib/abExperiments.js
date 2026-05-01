/**
 * Live A/B gameplay (not only copy).
 * Cohort A = control, B = treatment (documented for thesis export).
 */

/**
 * Baseline UX from stored A/B cohort.
 * Treatment (B): chess move hints · TTT staged undo · puzzle redo budget.
 */
export function flagsFromCohortLetter(letter) {
  const l = letter === "B" ? "B" : "A";
  const treatment = l === "B";
  return {
    cohortLetter: l,
    chessLegalHints: treatment,
    tttUndoOnceEachSide: treatment,
    puzzleRedoOnceLab: treatment,
  };
}

/** Inverse A↔B for paired studies. */
export function oppositeCohortLetter(letter) {
  return letter === "B" ? "A" : "B";
}

/**
 * Blind study duel assigns each uid a cohort letter — map to UX flags via same lookup.
 */
export function flagsFromBlindLetter(letter) {
  return flagsFromCohortLetter(letter);
}
