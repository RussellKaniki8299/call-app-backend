/**
 * Présence des utilisateurs : un utilisateur peut avoir PLUSIEURS sockets
 * (mobile + web + onglets). On ne le considère hors-ligne que lorsque
 * sa dernière socket se ferme.
 */
const socketsByUser = new Map(); // userId(string) -> Set<socketId>
const userBySocket = new Map(); // socketId -> userId(string)

const key = (userId) => String(userId);

/** @returns {boolean} true si c'est la première socket de l'utilisateur (il vient de passer en ligne) */
function add(userId, socketId) {
  const uid = key(userId);
  const previous = userBySocket.get(socketId);
  if (previous === uid) return false;
  if (previous) remove(socketId);

  let set = socketsByUser.get(uid);
  const isFirst = !set || set.size === 0;
  if (!set) {
    set = new Set();
    socketsByUser.set(uid, set);
  }
  set.add(socketId);
  userBySocket.set(socketId, uid);
  return isFirst;
}

/** @returns {{userId: string|null, wentOffline: boolean}} */
function remove(socketId) {
  const uid = userBySocket.get(socketId);
  if (!uid) return { userId: null, wentOffline: false };
  userBySocket.delete(socketId);

  const set = socketsByUser.get(uid);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) {
      socketsByUser.delete(uid);
      return { userId: uid, wentOffline: true };
    }
  }
  return { userId: uid, wentOffline: false };
}

const isOnline = (userId) => (socketsByUser.get(key(userId))?.size ?? 0) > 0;
const getUserId = (socketId) => userBySocket.get(socketId) || null;
const onlineCount = () => socketsByUser.size;

module.exports = { add, remove, isOnline, getUserId, onlineCount };
