/**
 * Consent‑gated puzzle / arcade instrumentation (RN + legacy WebView).
 */

import { logResearchEvent } from "@/lib/dissertation";
import { appendStudyEvent } from "@/lib/studySession";

async function relay(type, payload) {
  await logResearchEvent(type, payload ?? {});
  await appendStudyEvent(type, payload ?? {});
}

/**
 * Puzzle ladder / solo metrics payloads (RN surface).
 */
export async function dispatchPuzzleWebMessage(raw) {
  if (!raw || typeof raw !== "object") return;
  const { type } = raw;
  if (type === "ARCADE_SURFACE_OPEN") {
    await relay("arcade_surface_open", sanitize(raw));
    return;
  }
  if (type === "PUZZLE_LADDER") {
    await relay("puzzle_ladder", sanitize(raw));
    return;
  }
  if (type === "PUZZLE_SOLO_METRIC") {
    await relay("puzzle_solo_metric", sanitize(raw));
    return;
  }
}

export async function logPuzzleTelemetry(payload) {
  return dispatchPuzzleWebMessage(payload);
}

function sanitize(raw) {
  const out = {};
  const keys = [
    "runId",
    "solo",
    "ladderLevel",
    "phase",
    "gameKey",
    "game",
    "seed",
    "taps",
    "resets",
    "pausedMs",
    "redoBudgetStart",
    "redoUsedStage",
    "won",
    "abandoned",
    "fillsAll",
    "rotations",
    "slides",
    "score",
    "elapsedMs",
    "floorsWon",
  ];
  for (const k of keys) {
    if (raw[k] === undefined || raw[k] === null) continue;
    const v = raw[k];
    if (typeof v === "string") out[k] = v.slice(0, 120);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
  }
  return out;
}
