/**
 * Public HTTPS base for the deployed web app (challenges, study duels, deep links in Share).
 * Set EXPO_PUBLIC_WEB_APP_URL on Render (no trailing slash). Firebase Auth must allow this
 * host under Authentication → Settings → Authorized domains.
 */
const DEFAULT_ORIGIN = "https://dissertationgames.onrender.com";

function trimOrigin(raw) {
  const s = String(raw || "").trim().replace(/\/+$/, "");
  return s || DEFAULT_ORIGIN;
}

export function getWebAppOrigin() {
  return trimOrigin(process.env.EXPO_PUBLIC_WEB_APP_URL);
}

/** @param {string} path e.g. "/challenge/abc" or "challenge/abc" */
export function webAppUrl(path) {
  const o = getWebAppOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${o}${p}`;
}

export function challengeWebUrl(challengeId) {
  const id = encodeURIComponent(String(challengeId || "").trim());
  return webAppUrl(`/challenge/${id}`);
}

export function studyDuelJoinWebUrl(duelId) {
  const id = encodeURIComponent(String(duelId || "").trim());
  const q = new URLSearchParams({ id }).toString();
  return webAppUrl(`/study-duel/join?${q}`);
}

/** Friendly share body: HTTPS (works from web + SMS) + native scheme line */
export function shareChallengeLinks(challengeId) {
  const raw = String(challengeId || "").trim();
  const web = challengeWebUrl(raw);
  const app = `dissertationgames://challenge/${encodeURIComponent(raw)}`;
  return { web, app, message: `${web}\n(or app link: ${app})` };
}

export function shareStudyDuelLinks(duelId) {
  const raw = String(duelId || "").trim();
  const web = studyDuelJoinWebUrl(raw);
  const app = `dissertationgames://study-duel/join?id=${encodeURIComponent(raw)}`;
  return { web, app, message: `${web}\n(or app link: ${app})` };
}
