/** Compteurs poussés en temps réel vers un utilisateur (demandes d'amis, notifications, non-lus) */
const E = require('../events');
const rt = require('../../services/realtime.service');
const presence = require('../../store/presence.store');

const relayTo = (event, field) => (payload = {}) => {
  const { toUserId } = payload;
  if (toUserId && presence.isOnline(toUserId)) rt.toUser(toUserId, event, { [field]: payload[field] });
};

module.exports = function registerCounterHandlers(socket) {
  socket.on(E.NEW_FRIEND_REQUEST, relayTo(E.NEW_FRIEND_REQUEST, 'count'));
  socket.on(E.NEW_NOTIFICATION, relayTo(E.NEW_NOTIFICATION, 'count'));
  socket.on(E.UNREAD_MESSAGES_COUNT, relayTo(E.UNREAD_MESSAGES_COUNT, 'unread'));
};
