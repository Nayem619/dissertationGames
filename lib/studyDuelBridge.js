/** In-memory pending study duel invite id until host consumes it when creating a room. */

let pendingDuelInviteId = null;

export function setPendingStudyDuelInvite(id) {
  pendingDuelInviteId = typeof id === "string" && id.trim() ? id.trim() : null;
}

export function peekPendingStudyDuelInvite() {
  return pendingDuelInviteId;
}

export function takePendingStudyDuelInvite() {
  const id = pendingDuelInviteId;
  pendingDuelInviteId = null;
  return id;
}
