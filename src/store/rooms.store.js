/**
 * Rooms de visio / lives. Mémoire uniquement (redémarrage = rooms vides).
 * Une room vide est supprimée après `cleanupDelayMs` (reprise possible entre-temps).
 */
const { roomCleanupDelayMs, roomMaxParticipants } = require('../config/env');

const MAX_HISTORY = 200;
const rooms = new Map(); // roomId -> { participants: Map<socketId, info>, messages: [], timer }

const get = (roomId) => rooms.get(roomId);

function ensure(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = { participants: new Map(), messages: [], timer: null };
    rooms.set(roomId, room);
  }
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  return room;
}

/** @returns {{ok:boolean, reason?:string, room?:object}} */
function join(roomId, socketId, info) {
  const room = ensure(roomId);
  const alreadyIn = room.participants.has(socketId);
  if (!alreadyIn && roomMaxParticipants > 0 && room.participants.size >= roomMaxParticipants) {
    scheduleCleanupIfEmpty(roomId);
    return { ok: false, reason: 'full' };
  }
  room.participants.set(socketId, info);
  return { ok: true, room };
}

function leave(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room || !room.participants.has(socketId)) return null;
  const info = room.participants.get(socketId);
  room.participants.delete(socketId);
  scheduleCleanupIfEmpty(roomId);
  return info;
}

/** Retire une socket de toutes ses rooms (déconnexion). @returns {{roomId, info}[]} */
function leaveAll(socketId) {
  const left = [];
  for (const roomId of rooms.keys()) {
    const info = leave(roomId, socketId);
    if (info) left.push({ roomId, info });
  }
  return left;
}

function scheduleCleanupIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.participants.size > 0 || room.timer) return;
  room.timer = setTimeout(() => rooms.delete(roomId), roomCleanupDelayMs);
  room.timer.unref?.();
}

const participantsOf = (roomId, exceptSocketId) =>
  [...(rooms.get(roomId)?.participants.entries() ?? [])]
    .filter(([id]) => id !== exceptSocketId)
    .map(([userId, userInfo]) => ({ userId, userInfo }));

const countOf = (roomId) => rooms.get(roomId)?.participants.size ?? 0;

function pushMessage(roomId, payload) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.messages.push(payload);
  if (room.messages.length > MAX_HISTORY) room.messages.splice(0, room.messages.length - MAX_HISTORY);
}

const historyOf = (roomId) => rooms.get(roomId)?.messages ?? [];

const isMember = (roomId, socketId) => !!rooms.get(roomId)?.participants.has(socketId);

module.exports = {
  get, join, leave, leaveAll, participantsOf, countOf, pushMessage, historyOf, isMember,
};
