/**
 * Accès unique à l'instance Socket.IO + helpers d'émission.
 * Évite de passer (io, socket, users, rooms…) à chaque handler.
 */
const { userRoom } = require('../lib/ids');

let ioInstance = null;

const init = (io) => { ioInstance = io; };

const io = () => {
  if (!ioInstance) throw new Error('Socket.IO non initialisé');
  return ioInstance;
};

/** Émet vers TOUS les appareils d'un utilisateur */
const toUser = (userId, event, payload) => io().to(userRoom(userId)).emit(event, payload);

const toRoom = (roomId, event, payload) => io().to(roomId).emit(event, payload);

const toSocket = (socketId, event, payload) => io().to(socketId).emit(event, payload);

const broadcast = (event, payload) => io().emit(event, payload);

module.exports = { init, io, toUser, toRoom, toSocket, broadcast };
