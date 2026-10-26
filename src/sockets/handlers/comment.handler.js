const E = require('../events');
const rt = require('../../services/realtime.service');
const { postRoom } = require('../../lib/ids');
const { localDateTime } = require('../../lib/time');

module.exports = function registerCommentHandlers(socket) {
  socket.on(E.JOIN_POST_ROOM, (postId) => {
    if (postId) socket.join(postRoom(postId));
  });

  socket.on(E.SEND_POST_REPLY, ({ replyId, postId, user, content, fichiers = [], date_creation } = {}) => {
    if (!replyId || !postId || !user) return;

    rt.toRoom(postRoom(postId), E.NEW_POST_REPLY, {
      id: replyId,
      postId,
      user: {
        id: user.id,
        pseudo: user.pseudo,
        prenom: user.prenom,
        nom: user.nom,
        avatar: user.avatar || '',
        type_compte: user.type_compte || 'standard',
      },
      description: content,
      fichiers,
      date_creation: localDateTime(date_creation ? new Date(date_creation) : new Date()),
      type: 'reply',
      nb_like: 0,
      nb_comment: 0,
      nb_repost: 0,
      nb_vue: 0,
      repost_existe: false,
      fichier_existe: fichiers.length > 0,
    });
  });

  socket.on(E.DELETE_POST_REPLY, ({ replyId, postId } = {}) => {
    if (replyId && postId) rt.toRoom(postRoom(postId), E.DELETE_POST_REPLY, { replyId });
  });

  socket.on(E.EDIT_POST_REPLY, ({ replyId, postId, content } = {}) => {
    if (replyId && postId && content) rt.toRoom(postRoom(postId), E.EDIT_POST_REPLY, { replyId, content });
  });

  // Signaux « recharge les commentaires » (payload optionnel)
  [E.NEW_COMMENT, E.EDIT_COMMENT, E.DELETE_COMMENT].forEach((event) => {
    socket.on(event, (payload) => {
      if (payload?.postId) socket.to(postRoom(payload.postId)).emit(event, payload);
      else socket.broadcast.emit(event, payload);
    });
  });
};
