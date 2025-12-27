/**
 * Formatage de la date en heure locale (sans UTC)
 * Format : YYYY-MM-DD HH:mm:ss
 */
function formatDateLocal(date = new Date()) {
  const pad = (n) => n.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = function registerCommentHandlers(io, socket, users) {

  /**
   * Émettre un nouveau commentaire / reply à un post
   */
  socket.on("send-post-reply", (data) => {
    const {
      replyId,
      postId,
      user,
      content,
      fichiers = [],
      date_creation
    } = data;

    // Sécurité minimale
    if (!replyId || !postId || !user) return;

    const replyData = {
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

      // Date locale correcte (plus de -1h)
      date_creation: date_creation
        ? formatDateLocal(new Date(date_creation))
        : formatDateLocal(),

      type: "reply",
      nb_like: 0,
      nb_comment: 0,
      nb_repost: 0,
      nb_vue: 0,
      repost_existe: false,
      fichier_existe: fichiers.length > 0,
    };

    io.to(postId.toString()).emit("new-post-reply", replyData);

    console.log(
      `[Reply] Nouveau reply ${replyId} sur le post ${postId} par ${user.id} à ${replyData.date_creation}`
    );
  });

  /**
   * Rejoindre la room d'un post
   */
  socket.on("join-post-room", (postId) => {
    if (!postId) return;
    socket.join(postId.toString());
    console.log(`[Post Room] ${socket.id} a rejoint le post ${postId}`);
  });

  /**
   * Supprimer un reply
   */
  socket.on("delete-post-reply", ({ replyId, postId }) => {
    if (!replyId || !postId) return;
    io.to(postId.toString()).emit("delete-post-reply", { replyId });
    console.log(`[Reply] Reply ${replyId} supprimé du post ${postId}`);
  });

  /**
   * Modifier un reply
   */
  socket.on("edit-post-reply", ({ replyId, postId, content }) => {
    if (!replyId || !postId || !content) return;
    io.to(postId.toString()).emit("edit-post-reply", { replyId, content });
    console.log(`[Reply] Reply ${replyId} modifié sur le post ${postId}`);
  });
};
