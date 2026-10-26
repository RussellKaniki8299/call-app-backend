require('dotenv').config();

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const isProd = process.env.NODE_ENV === 'production';

const notifyKey = process.env.SOCKET_NOTIFY_KEY || process.env.NODE_NOTIFY_KEY;
if (!notifyKey && isProd) {
  // Plus aucune clé par défaut dans le code : on refuse de démarrer sans secret.
  throw new Error('SOCKET_NOTIFY_KEY (ou NODE_NOTIFY_KEY) est obligatoire en production');
}

const corsOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

module.exports = Object.freeze({
  isProd,
  port: toInt(process.env.PORT, 5000),
  corsOrigin: corsOrigins.includes('*') ? '*' : corsOrigins,
  notifyKey: notifyKey || 'dev-only-key',

  laravelApiUrl: (process.env.LARAVEL_API_URL || 'https://api.rudless.com/api').replace(/\/$/, ''),
  expoPushUrl: process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send',

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  ffmpegPath: process.env.FFMPEG_PATH || '',
  maxUploadBytes: toInt(process.env.MAX_UPLOAD_MB, 50) * 1024 * 1024,

  // /send-push n'exigeait pas de clé : passez à true une fois Laravel mis à jour pour l'envoyer
  pushRequireKey: process.env.PUSH_REQUIRE_KEY === 'true',

  callRingTimeoutMs: toInt(process.env.CALL_RING_TIMEOUT_MS, 45000),
  roomMaxParticipants: toInt(process.env.ROOM_MAX_PARTICIPANTS, 10),
  roomCleanupDelayMs: toInt(process.env.ROOM_CLEANUP_DELAY_MS, 30 * 60 * 1000),
});
