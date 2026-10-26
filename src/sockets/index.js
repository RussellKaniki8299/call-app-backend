const { Server } = require('socket.io');
const { corsOrigin } = require('../config/env');
const rt = require('../services/realtime.service');
const presence = require('../store/presence.store');
const logger = require('../lib/logger')('Socket');

const presenceHandler = require('./handlers/presence.handler');
const callHandler = require('./handlers/call.handler');
const roomHandler = require('./handlers/room.handler');
const streamHandler = require('./handlers/stream.handler');
const registerChat = require('./handlers/chat.handler');
const registerSignaling = require('./handlers/signaling.handler');
const registerComments = require('./handlers/comment.handler');
const registerCounters = require('./handlers/counters.handler');

/** Attache Socket.IO au serveur HTTP et enregistre tous les handlers */
function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin },
    pingInterval: 20000,
    pingTimeout: 25000,
  });
  rt.init(io);

  io.on('connection', (socket) => {
    logger.debug(`connecté ${socket.id}`);

    presenceHandler.register(socket);
    registerChat(socket);
    callHandler.register(socket);
    roomHandler.register(socket);
    registerSignaling(socket);
    streamHandler.register(socket);
    registerComments(socket);
    registerCounters(socket);

    // Déconnexion centralisée : le contexte de présence est calculé UNE fois
    socket.on('disconnect', (reason) => {
      const ctx = presence.remove(socket.id);
      logger.debug(`déconnecté ${socket.id} (${reason})`);

      presenceHandler.onDisconnect(socket, ctx);
      callHandler.onDisconnect(socket, ctx);
      roomHandler.onDisconnect(socket);
      streamHandler.onDisconnect(socket);
    });
  });

  return io;
}

module.exports = { attachSocketServer };
