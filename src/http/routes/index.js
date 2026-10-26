const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const requireKey = require('../middlewares/requireKey');
const { chatUpload, tempUpload } = require('../middlewares/upload');
const { pushRequireKey } = require('../../config/env');
const presence = require('../../store/presence.store');

const counters = require('../controllers/counters.controller');
const push = require('../controllers/push.controller');
const media = require('../controllers/media.controller');

const router = express.Router();

// ── Santé
router.get('/', (_req, res) => res.send('Backend Socket.IO en ligne !'));
router.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), onlineUsers: presence.onlineCount() }));

// ── Compteurs temps réel (appelés par Laravel, protégés par clé)
router.post('/count-notification', requireKey(), counters.countNotification);
router.post('/count-friend-request', requireKey(), counters.countFriendRequest);
router.post('/count-message', requireKey(), counters.countMessage);

// ── Push Expo
router.post('/send-push', requireKey(pushRequireKey), asyncHandler(push.sendPush));

// ── Uploads
router.post('/api/chat/upload', chatUpload.array('files'), media.uploadChatFiles);
router.post('/api/media/upload-images', tempUpload.array('images', 20), asyncHandler(media.uploadImages));
router.post('/api/media/upload-video', tempUpload.single('video'), asyncHandler(media.uploadVideo));

module.exports = router;
