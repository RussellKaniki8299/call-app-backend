/**
 * Gestion des événements de chat (privé, public, fichiers, etc.)
 */
module.exports = function registerChatHandlers(io, socket, users) {
  // --- Rejoindre sa "room personnelle"
  socket.on("join-user", (userId) => {
    if (!userId) return;
    socket.join(userId.toString());
    users[userId] = socket.id;
    console.log(`[Chat] ${socket.id} rejoint la room user ${userId}`);
  });

  // --- Message privé texte ou audio
  socket.on(
    "send-private-message",
    ({
      toUserId,
      fromUserId,
      message,
      fichiers,
      msg_audio,
      time,
      avatar,
      msg_id,
      preview,
      reply_to,
    }) => {
      if (!toUserId || !fromUserId) return;

      const payloadForSender = {
        msg_id: msg_id || Math.random().toString(),
        sender: "Vous",
        senderId: fromUserId,
        recipient: toUserId,
        content: message || "",
        msg_audio: msg_audio || "",        
        fichiers: fichiers || [],          
        time: time || new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        lu: 0,
        avatar: avatar || "",
        preview: preview || false,
        reply_to: reply_to || 0,
      };

      const payloadForRecipient = {
        ...payloadForSender,
        sender: "Lui/Elle",
      };

      console.log(`[Serveur] Message privé reçu:`, payloadForSender);

      // --- Emission aux deux utilisateurs
      io.to(toUserId.toString()).emit("receive-private-message", payloadForRecipient);
      io.to(fromUserId.toString()).emit("receive-private-message", payloadForSender);

      // --- Mise à jour liste correspondants
      const lastMessagePreview =
        message ||
        (msg_audio ? "[message audio]" : "") ||
        (fichiers?.length
          ? `[fichier: ${fichiers.map((f) => f.name || f.fileName).join(", ")}]`
          : "");

      io.to(toUserId.toString()).emit("update-correspondant-list", {
        userId: fromUserId,
        lastMessage: lastMessagePreview,
        time: payloadForRecipient.time,
        lu: 0,
      });

      io.to(fromUserId.toString()).emit("update-correspondant-list", {
        userId: toUserId,
        lastMessage: lastMessagePreview,
        time: payloadForSender.time,
        lu: 1,
      });

      console.log(`[Chat privé] ${fromUserId} → ${toUserId} : ${lastMessagePreview}`);
    }
  );

  // --- Statut "écrit..." (typing)
  socket.on("typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;
    io.to(toUserId.toString()).emit("user-typing", { fromUserId });
    io.to(toUserId.toString()).emit("update-correspondant-list", { userId: fromUserId, typing: true });
  });

  socket.on("stop-typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;
    io.to(toUserId.toString()).emit("user-stop-typing", { fromUserId });
    io.to(toUserId.toString()).emit("update-correspondant-list", { userId: fromUserId, typing: false });
  });

  // --- Lecture des messages
  socket.on("mark-messages-read", ({ fromUserId, toUserId }) => {
    if (!fromUserId || !toUserId) return;

    console.log(`[Lecture] ${fromUserId} a lu les messages de ${toUserId}`);

    io.to(toUserId.toString()).emit("messages-read", { byUserId: fromUserId });

    io.to(toUserId.toString()).emit("update-correspondant-list", { userId: fromUserId, lu: 1 });
    io.to(fromUserId.toString()).emit("update-correspondant-list", { userId: toUserId, lu: 1 });
  });

  // --- Envoi de fichiers directs (binaire ou base64)
  socket.on(
    "send-file",
    ({ toUserId, fromUserId, file, fileName, mimeType, avatar, msg_id, preview, reply_to }) => {
      if (!toUserId || !fromUserId || !file) return;

      const payloadForSender = {
        msg_id: msg_id || Math.random().toString(),
        sender: "Vous",
        senderId: fromUserId,
        recipient: toUserId,
        fichier: file,
        fileName,
        mimeType,
        time: new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        lu: 0,
        avatar: avatar || "",
        preview: preview || false,
        reply_to: reply_to || 0,
        content: "",
      };

      const payloadForRecipient = { ...payloadForSender, sender: "Lui/Elle" };

      io.to(toUserId.toString()).emit("receive-file", payloadForRecipient);
      io.to(fromUserId.toString()).emit("receive-file", payloadForSender);

      const lastMessagePreview = `[fichier: ${fileName}]`;
      io.to(toUserId.toString()).emit("update-correspondant-list", {
        userId: fromUserId,
        lastMessage: lastMessagePreview,
        time: payloadForRecipient.time,
        lu: 0,
      });

      io.to(fromUserId.toString()).emit("update-correspondant-list", {
        userId: toUserId,
        lastMessage: lastMessagePreview,
        time: payloadForSender.time,
        lu: 1,
      });

      console.log(`[Chat fichier] ${fromUserId} → ${toUserId} : ${fileName}`);
    }
  );

  // --- Broadcast global
  socket.on("broadcast-message", (message) => {
    const payload = { content: message, time: new Date().toISOString() };
    io.emit("receive-broadcast-message", payload);
    console.log(`[Broadcast] ${message}`);
  });

  // --- Chat public fallback
  socket.on("new-message", (msg) => {
    socket.broadcast.emit("new-message", msg);
  });

  // --- Commentaires publics
  socket.on("new-comment", (comment) => {
    io.emit("new-comment", comment);
  });

  // --- Suppression / édition
  socket.on("delete-message", (messageId) => {
    io.emit("delete-message", messageId);
    console.log(`[Suppression message] ID: ${messageId}`);
  });

  socket.on("edit-message", (updatedMessage) => {
    io.emit("edit-message", updatedMessage);
    console.log(`[Édition message]`, updatedMessage);
  });
};
