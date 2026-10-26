/**
 * Contrat des événements Socket.IO (source de vérité côté serveur).
 * Les clients (web, meet, mobile) ont leur copie dans `services/socket/events`.
 */
module.exports = Object.freeze({
  // ── Connexion / présence
  REGISTER_USER: 'register-user',
  REGISTER_LEGACY: 'register',
  JOIN_USER: 'join-user',
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
  PING_TEST: 'ping-test',

  // ── Chat privé
  SEND_PRIVATE_MESSAGE: 'send-private-message',
  RECEIVE_PRIVATE_MESSAGE: 'receive-private-message',
  SEND_FILE: 'send-file',
  TYPING: 'typing',
  STOP_TYPING: 'stop-typing',
  USER_TYPING: 'user-typing',
  USER_STOP_TYPING: 'user-stop-typing',
  MARK_MESSAGES_READ: 'mark-messages-read',
  MESSAGES_READ: 'messages-read',
  DELETE_MESSAGE: 'delete-message',
  EDIT_MESSAGE: 'edit-message',
  UPDATE_CORRESPONDANT_LIST: 'update-correspondant-list',
  BROADCAST_MESSAGE: 'broadcast-message',
  RECEIVE_BROADCAST_MESSAGE: 'receive-broadcast-message',
  NEW_MESSAGE: 'new-message',

  // ── Appels 1-à-1
  CALL_USER: 'call-user',
  INCOMING_CALL: 'incoming-call',
  ACCEPT_CALL: 'accept-call',
  CALL_ACCEPTED: 'call-accepted',
  REJECT_CALL: 'reject-call',
  CALL_REJECTED: 'call-rejected',
  CANCEL_CALL: 'cancel-call',
  CALL_CANCELLED: 'call-cancelled',
  CALL_ENDED: 'call-ended',
  CALL_ERROR: 'call-error',
  USER_BUSY: 'user-busy',

  // ── Rooms (visio / lives)
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  EXISTING_USERS: 'existing-users',
  ROOM_HISTORY: 'room-history',
  ROOM_MESSAGE: 'room-message',
  ROOM_PARTICIPANT_COUNT: 'room-participant-count',
  ROOM_FULL: 'room-full',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  UPDATE_MICRO: 'update-micro',
  MICRO_UPDATED: 'micro-updated',

  // ── Signalisation WebRTC (rooms)
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',

  // ── Diffusion 1-vers-N (streaming)
  START_STREAM: 'start-stream',
  STOP_STREAM: 'stop-stream',
  JOIN_STREAM: 'join-stream',
  VIEWER_CONNECTED: 'viewer-connected',
  VIEWER_LEFT: 'viewer-left',
  STREAM_ENDED: 'stream-ended',
  STREAM_NOT_FOUND: 'stream-not-found',
  SEND_OFFER: 'send-offer',
  SEND_ANSWER: 'send-answer',
  SEND_ICE_CANDIDATE: 'send-ice-candidate',

  // ── Commentaires
  JOIN_POST_ROOM: 'join-post-room',
  SEND_POST_REPLY: 'send-post-reply',
  NEW_POST_REPLY: 'new-post-reply',
  DELETE_POST_REPLY: 'delete-post-reply',
  EDIT_POST_REPLY: 'edit-post-reply',
  NEW_COMMENT: 'new-comment',
  EDIT_COMMENT: 'edit-comment',
  DELETE_COMMENT: 'delete-comment',

  // ── Compteurs / notifications
  NEW_FRIEND_REQUEST: 'new-friend-request',
  NEW_FRIEND_REQUEST_COUNT: 'new-friend-request-count',
  NEW_NOTIFICATION: 'new-notification',
  NEW_NOTIFICATION_COUNT: 'new-notification-count',
  NEW_MESSAGE_COUNT: 'new-message-count',
  UNREAD_MESSAGES_COUNT: 'unread-messages-count',
});
