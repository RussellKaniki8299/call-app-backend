/**
 * Gestion des événements de chat (privé, public, fichiers, etc.)
 */

module.exports = function registerChatHandlers(io, socket, users) {

  // --- Rejoindre sa room personnelle
  socket.on("join-user", (userId) => {
    if (!userId) return;
    socket.join(userId.toString());
    users[userId] = socket.id;
    console.log(`[Chat] ${socket.id} rejoint la room user ${userId}`);
  });

  /**
   * Fonction utilitaire pour envoyer un message privé
   * + signal update-correspondant-list
   */
  function emitPrivateMessage(io, fromUserId, toUserId, payloadForSender, payloadForRecipient) {
    
    // Message pour destinataire
    io.to(toUserId.toString()).emit("receive-private-message", payloadForRecipient);

    // Message pour expéditeur
    io.to(fromUserId.toString()).emit("receive-private-message", payloadForSender);

    // --- SIGNALS (pas de data !)
    io.to(toUserId.toString()).emit("update-correspondant-list");
    io.to(fromUserId.toString()).emit("update-correspondant-list");

    console.log(`[Chat privé] ${fromUserId} → ${toUserId}`);
  }

  // --- Envoi message privé texte/audio/fichiers groupés
  socket.on("send-private-message", (data) => {

    const {
      toUserId, 
      fromUserId, 
      message, 
      fichiers, 
      msg_audio,
      time, 
      avatar, 
      msg_id, 
      preview, 
      reply_to
    } = data;

    if (!toUserId || !fromUserId) return;

    const common = {
      msg_id: msg_id || Math.random().toString(),
      senderId: fromUserId,
      recipient: toUserId,
      content: message || "",
      msg_audio: msg_audio || "",
      fichiers: fichiers || [],
      avatar: avatar || "",
      preview: preview || false,
      reply_to: reply_to || 0,
      time: time || new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    const payloadForSender = {
      ...common,
      sender: "Vous",
      lu: 0,
    };

    const payloadForRecipient = {
      ...common,
      sender: "Lui/Elle",
      lu: 0,
    };

    emitPrivateMessage(io, fromUserId, toUserId, payloadForSender, payloadForRecipient);
  });

  // --- Envoi fichier direct
  socket.on("send-file", (data) => {
    const {
      toUserId,
      fromUserId,
      file,
      fileName,
      mimeType,
      avatar,
      msg_id,
      preview,
      reply_to
    } = data;

    if (!toUserId || !fromUserId || !file) return;

    const common = {
      msg_id: msg_id || Math.random().toString(),
      senderId: fromUserId,
      recipient: toUserId,
      fichier: file,
      fileName,
      mimeType,
      avatar: avatar || "",
      preview: preview || false,
      reply_to: reply_to || 0,
      content: "",
      time: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    const payloadForSender = { ...common, sender: "Vous", lu: 0 };
    const payloadForRecipient = { ...common, sender: "Lui/Elle", lu: 0 };

    emitPrivateMessage(io, fromUserId, toUserId, payloadForSender, payloadForRecipient);

    console.log(`[Chat fichier] ${fromUserId} → ${toUserId} : ${fileName}`);
  });

  // --- Typing
  socket.on("typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;
    io.to(toUserId.toString()).emit("user-typing", { fromUserId });
  });

  socket.on("stop-typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;
    io.to(toUserId.toString()).emit("user-stop-typing", { fromUserId });
  });

  // --- Messages lus
  socket.on("mark-messages-read", ({ fromUserId, toUserId }) => {
    if (!fromUserId || !toUserId) return;

    io.to(toUserId.toString()).emit("messages-read", { byUserId: fromUserId });

    // signal refresh list
    io.to(toUserId.toString()).emit("update-correspondant-list");
    io.to(fromUserId.toString()).emit("update-correspondant-list");

    console.log(`[Lecture] ${fromUserId} a lu les messages de ${toUserId}`);
  });

  // --- Broadcast global
  socket.on("broadcast-message", (message) => {
    const payload = { content: message, time: new Date().toISOString() };
    io.emit("receive-broadcast-message", payload);
  });

  // --- Chat public fallback
  socket.on("new-message", (msg) => {
    socket.broadcast.emit("new-message", msg);
  });

  // --- Commentaires publics
  socket.on("new-comment", (comment) => {
    io.emit("new-comment", comment);
  });

  // --- Suppression et édition
  socket.on("delete-message", (messageId) => {
    io.emit("delete-message", messageId);
  });

  socket.on("edit-message", (updatedMessage) => {
    io.emit("edit-message", updatedMessage);
  });
};
