/**
 * Lightweight head-to-head stats from persisted online_matches (no separate ladder doc).
 */

import { listUserRecentMatches } from "@/lib/matchHistory";

export const RIVAL_MIN_GAMES = 3;

function outcomeForViewer(row, viewerUid, foeUid) {
  const ou = row?.outcome;
  const winner = row?.winnerUid;
  if (ou === "draw") return "draw";
  if (ou === "abandon") {
    if (row?.leftUid === viewerUid) return "leave_you";
    if (row?.leftUid === foeUid) return "leave_them";
  }
  if (winner === viewerUid) return "win_you";
  if (winner === foeUid) return "win_them";
  return "unknown";
}

function summarizeRow(row, viewerUid, foeUid, oc) {
  const foeName = row?.participantNames?.[foeUid] || "them";
  const youName = row?.participantNames?.[viewerUid] || "you";
  const g = String(row?.game || "") === "chess" ? "Chess" : "TTT";
  switch (oc) {
    case "win_you":
      return `${g}: ${youName} won`;
    case "win_them":
      return `${g}: ${foeName} won`;
    case "draw":
      return `${g}: draw`;
    case "leave_you":
      return `${g}: you left`;
    case "leave_them":
      return `${g}: they left`;
    default:
      return `${g}: finished`;
  }
}

/** Builds a minimal “rival arc” when two profiles have crossed paths enough times. */
export async function buildRivalArc(viewerUid, foeUid, limitMatches = 80) {
  if (!viewerUid || !foeUid || viewerUid === foeUid) return null;
  const rows = await listUserRecentMatches(viewerUid, limitMatches);
  const shared = rows.filter((r) => {
    const p = r?.participantUids || [];
    return p.includes(foeUid) && p.includes(viewerUid);
  });
  if (shared.length < RIVAL_MIN_GAMES) return null;

  let winsYou = 0;
  let winsThem = 0;
  let draws = 0;
  let abandonsYou = 0;
  let abandonsThey = 0;
  const timeline = [];

  for (let i = 0; i < shared.length; i++) {
    const row = shared[i];
    const oc = outcomeForViewer(row, viewerUid, foeUid);
    if (oc === "win_you") winsYou++;
    else if (oc === "win_them") winsThem++;
    else if (oc === "draw") draws++;
    else if (oc === "leave_you") abandonsYou++;
    else if (oc === "leave_them") abandonsThey++;
    if (i < 14) timeline.push({ id: row.id || `${i}`, gist: summarizeRow(row, viewerUid, foeUid, oc) });
  }

  return {
    matches: shared.length,
    winsYou,
    winsThem,
    draws,
    abandonsYou,
    abandonsThey,
    rivalMinMet: RIVAL_MIN_GAMES,
    timeline,
  };
}
