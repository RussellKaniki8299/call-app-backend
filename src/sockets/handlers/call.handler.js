const E = require('../events');
const calls = require('../../store/calls.store');
const presence = require('../../store/presence.store');
const rt = require('../../services/realtime.service');
const logger = require('../../lib/logger')('Call');

const idOf = (v) => (v && typeof v === 'object' ? v.id : v);

function register(socket) {
  // ── Appeler un utilisateur
  socket.on(E.CALL_USER, ({ fromUser, toUser, callType, roomId } = {}) => {
    const callerId = idOf(fromUser);
    if (!callerId || !toUser || !callType || !roomId) {
      return socket.emit(E.CALL_ERROR, { message: 'Paramètres invalides.' });
    }
    if (!presence.isOnline(toUser)) {
      return socket.emit(E.CALL_ERROR, { message: "L'utilisateur est hors ligne." });
    }
    if (calls.isBusy(toUser)) {
      return socket.emit(E.USER_BUSY, { toUser });
    }

    calls.startRinging({ callerId, calleeId: toUser, roomId, callType }, ({ callerId: c, calleeId, roomId: r }) => {
      // Sans réponse : on libère l'appelé et on prévient l'appelant
      rt.toUser(calleeId, E.CALL_CANCELLED, { reason: 'timeout', roomId: r });
      rt.toUser(c, E.CALL_ERROR, { message: "Pas de réponse.", reason: 'timeout' });
    });

    rt.toUser(toUser, E.INCOMING_CALL, { fromUser, callType, roomId });
    logger.info(`Appel ${callType} ${callerId} → ${toUser}`);
  });

  // ── L'appelé décroche (fromUserId = appelant, toUserId = appelé)
  socket.on(E.ACCEPT_CALL, ({ fromUserId, toUserId, roomId, callType } = {}) => {
    if (!fromUserId || !toUserId) return;
    calls.accept(fromUserId, toUserId, roomId);
    rt.toUser(fromUserId, E.CALL_ACCEPTED, { roomId, callType });
  });

  // ── L'appelé refuse
  socket.on(E.REJECT_CALL, ({ fromUserId, toUserId } = {}) => {
    if (!fromUserId) return;
    calls.endFor(toUserId ?? fromUserId);
    rt.toUser(fromUserId, E.CALL_REJECTED, { toUserId, from: socket.id });
  });

  // ── Variante émise par certains écrans (le destinataire est `toUserId`)
  socket.on(E.CALL_REJECTED, ({ toUserId } = {}) => {
    if (!toUserId) return;
    calls.endFor(toUserId);
    rt.toUser(toUserId, E.CALL_REJECTED, { from: socket.id });
  });

  // ── L'appelant annule
  const cancel = ({ toUserId } = {}) => {
    if (!toUserId) return;
    calls.clearRinging(toUserId);
    calls.endFor(toUserId);
    rt.toUser(toUserId, E.CALL_CANCELLED, { from: socket.id });
  };
  socket.on(E.CANCEL_CALL, cancel);
  socket.on(E.CALL_CANCELLED, cancel);

  // ── Fin d'appel
  socket.on(E.CALL_ENDED, ({ toUserId, roomId } = {}) => {
    if (!toUserId) return;
    calls.endFor(toUserId);
    rt.toUser(toUserId, E.CALL_ENDED, { from: socket.id, roomId });
  });
}

/** Libère l'interlocuteur si c'était la dernière socket de l'utilisateur */
function onDisconnect(socket, { userId, wentOffline }) {
  if (!userId || !wentOffline) return;
  const peer = calls.endFor(userId);
  if (peer) rt.toUser(peer, E.CALL_ENDED, { from: socket.id, reason: 'disconnect' });
}

module.exports = { register, onDisconnect };
