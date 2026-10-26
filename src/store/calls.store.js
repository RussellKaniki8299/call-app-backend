/**
 * États d'appel 1-à-1 :
 *  - ringing : l'appelé reçoit l'appel (timeout automatique)
 *  - active  : appel décroché (les deux parties sont « occupées »)
 * Sert à renvoyer `user-busy` et à annuler les appels fantômes.
 */
const { callRingTimeoutMs } = require('../config/env');

const ringing = new Map(); // calleeId -> { callerId, roomId, callType, timer }
const active = new Map(); // userId -> { peerId, roomId, since }

const k = (v) => String(v);
const ACTIVE_TTL_MS = 6 * 60 * 60 * 1000; // garde-fou : un appel « actif » expire après 6 h

function isBusy(userId) {
  const uid = k(userId);
  const a = active.get(uid);
  if (a && Date.now() - a.since > ACTIVE_TTL_MS) {
    active.delete(uid);
  } else if (a) {
    return true;
  }
  return ringing.has(uid);
}

function startRinging({ callerId, calleeId, roomId, callType }, onTimeout) {
  const callee = k(calleeId);
  clearRinging(callee);
  const timer = setTimeout(() => {
    ringing.delete(callee);
    onTimeout?.({ callerId: k(callerId), calleeId: callee, roomId });
  }, callRingTimeoutMs);
  timer.unref?.();
  ringing.set(callee, { callerId: k(callerId), roomId, callType, timer });
}

function clearRinging(calleeId) {
  const r = ringing.get(k(calleeId));
  if (r) {
    clearTimeout(r.timer);
    ringing.delete(k(calleeId));
  }
  return r || null;
}

function accept(callerId, calleeId, roomId) {
  clearRinging(calleeId);
  const since = Date.now();
  active.set(k(callerId), { peerId: k(calleeId), roomId, since });
  active.set(k(calleeId), { peerId: k(callerId), roomId, since });
}

/** Termine tout appel (sonnerie ou actif) concernant cet utilisateur. @returns {string|null} id du pair */
function endFor(userId) {
  const uid = k(userId);
  let peer = null;

  const a = active.get(uid);
  if (a) {
    peer = a.peerId;
    active.delete(uid);
    active.delete(a.peerId);
  }

  clearRinging(uid); // il était appelé
  for (const [calleeId, r] of ringing.entries()) {
    if (r.callerId === uid) { // il appelait quelqu'un
      peer = peer || calleeId;
      clearRinging(calleeId);
    }
  }
  return peer;
}

module.exports = { isBusy, startRinging, clearRinging, accept, endFor };
