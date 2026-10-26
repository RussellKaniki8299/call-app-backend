const http = require('http');
const app = require('./app');
const { port } = require('./config/env');
const { attachSocketServer } = require('./sockets');
const logger = require('./lib/logger')('Server');

const server = http.createServer(app);
const io = attachSocketServer(server);

server.listen(port, () => logger.info(`Serveur Socket.IO prêt sur le port ${port}`));

// Arrêt propre (déploiements / redémarrages)
const shutdown = (signal) => {
  logger.info(`${signal} reçu, arrêt en cours…`);
  io.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', { reason: String(reason) }));
