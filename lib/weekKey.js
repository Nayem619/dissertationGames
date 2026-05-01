/** ISO week label e.g. 2026-W18 for leaderboard filters */
export function getISOWeekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  const y = t.getUTCFullYear();
  return `${y}-W${String(weekNo).padStart(2, "0")}`;
}
