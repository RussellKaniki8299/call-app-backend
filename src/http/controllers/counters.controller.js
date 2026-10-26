const E = require('../../sockets/events');
const rt = require('../../services/realtime.service');
const logger = require('../../lib/logger')('Counters');

/** Fabrique un contrôleur « pousse un compteur vers l'utilisateur » */
const counterController = (event, label) => (req, res) => {
  const { toUserId, count } = req.body || {};
  if (!toUserId) return res.status(400).json({ error: 'toUserId manquant' });

  rt.toUser(toUserId, event, { count });
  logger.debug(`${label} → user ${toUserId} : ${count}`);
  return res.json({ status: 'ok' });
};

module.exports = {
  countNotification: counterController(E.NEW_NOTIFICATION_COUNT, 'notifications'),
  countFriendRequest: counterController(E.NEW_FRIEND_REQUEST_COUNT, 'demandes d\'amis'),
  countMessage: counterController(E.NEW_MESSAGE_COUNT, 'messages'),
};
