/**
 * Diffusion 1 → N (streaming) : le diffuseur crée un stream (id = id de sa socket),
 * chaque spectateur le rejoint puis négocie une connexion WebRTC dédiée avec lui.
 */
const E = require('../events');
const rt = require('../../services/realtime.service');
const logger = require('../../lib/logger')('Stream');

const streams = new Map(); // streamId -> { broadcasterId, viewers:Set<socketId> }
const exists = (socketId) => !!rt.io().sockets.sockets.get(socketId);

function endStream(streamId) {
  const stream = streams.get(streamId);
  if (!stream) return;
  rt.toRoom(`stream:${streamId}`, E.STREAM_ENDED, { streamId });
  streams.delete(streamId);
  logger.info(`Stream ${streamId} terminé`);
}

function register(socket) {
  socket.on(E.START_STREAM, (ack) => {
    const streamId = socket.id;
    streams.set(streamId, { broadcasterId: socket.id, viewers: new Set() });
    socket.join(`stream:${streamId}`);
    logger.info(`Stream ${streamId} démarré`);
    if (typeof ack === 'function') ack(streamId);
  });

  socket.on(E.STOP_STREAM, (streamId) => {
    if (streams.get(streamId)?.broadcasterId === socket.id) endStream(streamId);
  });

  socket.on(E.JOIN_STREAM, ({ streamId } = {}) => {
    const stream = streams.get(streamId);
    if (!stream) return socket.emit(E.STREAM_NOT_FOUND, { streamId });

    stream.viewers.add(socket.id);
    socket.join(`stream:${streamId}`);
    rt.toSocket(stream.broadcasterId, E.VIEWER_CONNECTED, socket.id);
  });

  // Négociation WebRTC diffuseur ↔ spectateur
  const relay = (event, field) => ({ to, ...rest } = {}) => {
    if (to && exists(to)) rt.toSocket(to, event, { [field]: rest[field], from: socket.id });
  };
  socket.on(E.SEND_OFFER, relay(E.SEND_OFFER, 'offer'));
  socket.on(E.SEND_ANSWER, relay(E.SEND_ANSWER, 'answer'));
  socket.on(E.SEND_ICE_CANDIDATE, relay(E.SEND_ICE_CANDIDATE, 'candidate'));
}

function onDisconnect(socket) {
  if (streams.has(socket.id)) return endStream(socket.id);
  for (const stream of streams.values()) {
    if (stream.viewers.delete(socket.id)) {
      rt.toSocket(stream.broadcasterId, E.VIEWER_LEFT, socket.id);
    }
  }
}

module.exports = { register, onDisconnect };
