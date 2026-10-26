const E = require('../events');
const presence = require('../../store/presence.store');
const rt = require('../../services/realtime.service');
const laravel = require('../../services/laravel.service');
const { userRoom } = require('../../lib/ids');
const logger = require('../../lib/logger')('Presence');

// Délai avant de déclarer « hors ligne » (évite le clignotement lors d'un rechargement de page)
const OFFLINE_GRACE_MS = 5000;
const offlineTimers = new Map(); // userId -> timeout

function register(socket) {
  const registerUser = (userId) => {
    if (userId === undefined || userId === null || userId === '') return;

    // Changement de compte sur la même socket : on libère l'ancien utilisateur
    const previous = presence.getUserId(socket.id);
    if (previous && previous !== String(userId)) {
      socket.leave(userRoom(previous));
      onDisconnect(socket, presence.remove(socket.id));
    }

    socket.join(userRoom(userId));

    const pending = offlineTimers.get(String(userId));
    if (pending) {
      clearTimeout(pending);
      offlineTimers.delete(String(userId));
    }

    const becameOnline = presence.add(userId, socket.id);
    if (becameOnline && !pending) {
      logger.info(`Utilisateur ${userId} en ligne`);
      laravel.setUserOnline(userId);
      rt.broadcast(E.USER_ONLINE, { user_id: userId });
    }
  };

  socket.on(E.REGISTER_USER, registerUser);
  socket.on(E.REGISTER_LEGACY, registerUser); // ancien client « meet »
  socket.on(E.JOIN_USER, registerUser); // les écrans de chat utilisaient join-user

  socket.on(E.PING_TEST, (_payload, ack) => {
    if (typeof ack === 'function') ack({ ok: true, ts: Date.now() });
  });
}

/** @param {{userId: string|null, wentOffline: boolean}} ctx */
function onDisconnect(_socket, { userId, wentOffline }) {
  if (!userId || !wentOffline) return;

  const timer = setTimeout(() => {
    offlineTimers.delete(userId);
    if (presence.isOnline(userId)) return; // revenu entre-temps
    logger.info(`Utilisateur ${userId} hors ligne`);
    laravel.setUserOffline(userId);
    rt.broadcast(E.USER_OFFLINE, { user_id: userId });
  }, OFFLINE_GRACE_MS);
  timer.unref?.();
  offlineTimers.set(userId, timer);
}

module.exports = { register, onDisconnect };
