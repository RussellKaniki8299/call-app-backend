/**
 * Rooms : visioconférences ET lives (même mécanique, la room est identifiée par `roomId`).
 * La signalisation WebRTC (offer/answer/ice) est dans signaling.handler.js.
 */
const E = require('../events');
const rooms = require('../../store/rooms.store');
const rt = require('../../services/realtime.service');
const { roomMaxParticipants } = require('../../config/env');
const { newId } = require('../../lib/ids');

const nameOf = (info) => info?.prenom || 'Utilisateur';

function announceCount(roomId) {
  rt.toRoom(roomId, E.ROOM_PARTICIPANT_COUNT, rooms.countOf(roomId));
}

function leaveRoom(socket, roomId) {
  const info = rooms.leave(roomId, socket.id);
  if (!info) return;
  socket.leave(roomId);
  socket.to(roomId).emit(E.USER_LEFT, { userId: socket.id, message: `${nameOf(info)} a quitté la room` });
  announceCount(roomId);
}

function register(socket) {
  socket.on(E.JOIN_ROOM, ({ roomId, userInfo, microOn } = {}) => {
    if (!roomId || !userInfo) return;

    const result = rooms.join(roomId, socket.id, {
      ...userInfo,
      microOn: typeof microOn === 'boolean' ? microOn : true,
    });
    if (!result.ok) {
      return socket.emit(E.ROOM_FULL, { roomId, max: roomMaxParticipants });
    }

    socket.join(roomId);
    socket.emit(E.EXISTING_USERS, rooms.participantsOf(roomId, socket.id));
    socket.emit(E.ROOM_HISTORY, rooms.historyOf(roomId));

    socket.to(roomId).emit(E.USER_JOINED, {
      userId: socket.id,
      userInfo: result.room.participants.get(socket.id),
      message: `${nameOf(userInfo)} a rejoint la room`,
    });
    announceCount(roomId);
  });

  socket.on(E.LEAVE_ROOM, ({ roomId } = {}) => roomId && leaveRoom(socket, roomId));

  socket.on(E.UPDATE_MICRO, ({ roomId, microOn } = {}) => {
    if (!rooms.isMember(roomId, socket.id)) return;
    rooms.get(roomId).participants.get(socket.id).microOn = !!microOn;
    rt.toRoom(roomId, E.MICRO_UPDATED, { userId: socket.id, microOn: !!microOn });
  });

  socket.on(E.ROOM_MESSAGE, ({ senderId, roomId, message, files, user } = {}) => {
    if (!rooms.isMember(roomId, socket.id)) return;
    if (!message && !(files && files.length)) return;

    const payload = {
      id: newId(),
      type: 'user',
      roomId,
      message: message || '',
      files: files || [],
      sender: { id: senderId, nom: user?.nom, prenom: user?.prenom, avatar: user?.avatar, photo: user?.photo },
      createdAt: new Date().toISOString(),
    };
    rooms.pushMessage(roomId, payload);
    rt.toRoom(roomId, E.ROOM_MESSAGE, payload);
  });
}

function onDisconnect(socket) {
  rooms.leaveAll(socket.id).forEach(({ roomId, info }) => {
    socket.to(roomId).emit(E.USER_LEFT, { userId: socket.id, message: `${nameOf(info)} a quitté la room` });
    announceCount(roomId);
  });
}

module.exports = { register, onDisconnect };
