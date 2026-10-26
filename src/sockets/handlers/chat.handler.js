const E = require('../events');
const rt = require('../../services/realtime.service');
const { hhmm } = require('../../lib/time');
const { newId } = require('../../lib/ids');
const logger = require('../../lib/logger')('Chat');

const refreshLists = (...userIds) => userIds.forEach((id) => rt.toUser(id, E.UPDATE_CORRESPONDANT_LIST));

/** Envoie le message aux deux parties (point de vue « Vous » / « Lui/Elle ») */
function deliverPrivate(fromUserId, toUserId, common) {
  rt.toUser(toUserId, E.RECEIVE_PRIVATE_MESSAGE, { ...common, sender: 'Lui/Elle', lu: 0 });
  rt.toUser(fromUserId, E.RECEIVE_PRIVATE_MESSAGE, { ...common, sender: 'Vous', lu: 0 });
  refreshLists(toUserId, fromUserId);
}

module.exports = function registerChatHandlers(socket) {
  // ── Message privé (texte / audio / fichiers / story)
  socket.on(E.SEND_PRIVATE_MESSAGE, (data = {}) => {
    const { toUserId, fromUserId, message, original_text, fichiers, msg_audio, time, avatar,
      msg_id, preview, reply_to, story_id, type_msg } = data;
    if (!toUserId || !fromUserId) return;

    deliverPrivate(fromUserId, toUserId, {
      msg_id: msg_id || newId(),
      senderId: fromUserId,
      recipient: toUserId,
      content: message || '',
      original_text: original_text || message || '',
      msg_audio: msg_audio || '',
      fichiers: fichiers || [],
      avatar: avatar || '',
      preview: preview || false,
      reply_to: reply_to || 0,
      story_id: story_id || null,
      type_msg: type_msg || 'text',
      time: time || hhmm(),
    });
    logger.debug(`${fromUserId} → ${toUserId}`);
  });

  // ── Fichier direct
  socket.on(E.SEND_FILE, (data = {}) => {
    const { toUserId, fromUserId, file, fileName, mimeType, avatar, msg_id, preview,
      reply_to, story_id, type_msg } = data;
    if (!toUserId || !fromUserId || !file) return;

    deliverPrivate(fromUserId, toUserId, {
      msg_id: msg_id || newId(),
      senderId: fromUserId,
      recipient: toUserId,
      fichier: file,
      fileName,
      mimeType,
      avatar: avatar || '',
      preview: preview || false,
      reply_to: reply_to || 0,
      story_id: story_id || null,
      type_msg: type_msg || 'file',
      content: '',
      time: hhmm(),
    });
  });

  // ── Saisie en cours
  socket.on(E.TYPING, ({ toUserId, fromUserId } = {}) => {
    if (toUserId && fromUserId) rt.toUser(toUserId, E.USER_TYPING, { fromUserId });
  });
  socket.on(E.STOP_TYPING, ({ toUserId, fromUserId } = {}) => {
    if (toUserId && fromUserId) rt.toUser(toUserId, E.USER_STOP_TYPING, { fromUserId });
  });

  // ── Lecture
  socket.on(E.MARK_MESSAGES_READ, ({ fromUserId, toUserId } = {}) => {
    if (!fromUserId || !toUserId) return;
    rt.toUser(toUserId, E.MESSAGES_READ, { byUserId: fromUserId });
    refreshLists(toUserId, fromUserId);
  });

  // ── Suppression : "all" (pour tous) ou "self" (pour soi)
  socket.on(E.DELETE_MESSAGE, ({ messageId, fromUserId, toUserId, mode } = {}) => {
    if (!messageId || !fromUserId || !toUserId || !mode) return;

    if (mode === 'all') {
      rt.toUser(fromUserId, E.DELETE_MESSAGE, { messageId });
      rt.toUser(toUserId, E.DELETE_MESSAGE, { messageId });
      refreshLists(fromUserId, toUserId);
    } else if (mode === 'self') {
      rt.toUser(fromUserId, E.DELETE_MESSAGE, { messageId, selfDelete: true });
      refreshLists(fromUserId);
    }
  });

  // ── Modification
  socket.on(E.EDIT_MESSAGE, ({ messageId, newContent, fromUserId, toUserId } = {}) => {
    if (!messageId || !newContent || !fromUserId || !toUserId) return;
    const payload = { messageId, newContent };
    rt.toUser(fromUserId, E.EDIT_MESSAGE, payload);
    rt.toUser(toUserId, E.EDIT_MESSAGE, payload);
    refreshLists(fromUserId, toUserId);
  });

  // ── Diffusion globale / fallback public
  socket.on(E.BROADCAST_MESSAGE, (message) => {
    rt.broadcast(E.RECEIVE_BROADCAST_MESSAGE, { content: message, time: new Date().toISOString() });
  });
  socket.on(E.NEW_MESSAGE, (msg) => socket.broadcast.emit(E.NEW_MESSAGE, msg));
};
