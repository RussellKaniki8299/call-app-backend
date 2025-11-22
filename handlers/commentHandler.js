module.exports = function registerCommentHandlers(io, socket, users) {
  /**
   * Émettre un nouveau commentaire/reply à un post
   */
  socket.on("send-post-reply", (data) => {
    const { postId, fromUserId, content, fichiers = [], avatar = "", time } = data;
    if (!postId || !fromUserId || !content) return;

    const replyData = {
      replyId: Math.random().toString(),
      postId,
      fromUserId,
      content,
      fichiers,
      avatar,
      time: time || new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      type: "reply",
    };

    io.to(postId.toString()).emit("new-post-reply", replyData);
    console.log(`[Reply] Nouveau reply sur le post ${postId} par ${fromUserId}`);
  });

  /**
   * Rejoindre la room d'un post pour recevoir ses replies
   */
  socket.on("join-post-room", (postId) => {
    if (!postId) return;
    socket.join(postId.toString());
    console.log(`[Post Room] ${socket.id} rejoint la room du post ${postId}`);
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
