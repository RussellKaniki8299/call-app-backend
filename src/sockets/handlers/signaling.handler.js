/**
 * Relais de signalisation WebRTC (offer / answer / ice-candidate).
 * UN SEUL endroit : plus de doublons entre rooms et lives.
 */
const E = require('../events');
const rt = require('../../services/realtime.service');

const exists = (socketId) => !!rt.io().sockets.sockets.get(socketId);

module.exports = function registerSignalingHandlers(socket) {
  socket.on(E.OFFER, ({ offer, to } = {}) => {
    if (to && exists(to)) rt.toSocket(to, E.OFFER, { offer, from: socket.id });
  });

  socket.on(E.ANSWER, ({ answer, to } = {}) => {
    if (to && exists(to)) rt.toSocket(to, E.ANSWER, { answer, from: socket.id });
  });

  socket.on(E.ICE_CANDIDATE, ({ candidate, to } = {}) => {
    if (to && exists(to)) rt.toSocket(to, E.ICE_CANDIDATE, { candidate, from: socket.id });
  });
};
