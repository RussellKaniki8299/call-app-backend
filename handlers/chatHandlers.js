/**
 * Gestion des événements de chat (privé, public, fichiers, etc.)
 */

module.exports = function registerChatHandlers(io, socket, users) {
  // --- Rejoindre sa "room personnelle" ---
  socket.on("join-user", (userId) => {
    if (!userId) return;
    socket.join(userId.toString());
    users[userId] = socket.id;
    console.log(`[Chat] ${socket.id} rejoint la room user ${userId}`);
  });

  // --- Message privé texte ou avec fichiers ---
  socket.on("send-private-message", ({ toUserId, fromUserId, message, fichiers }) => {
    if (!toUserId || !fromUserId) return;

    const payload = {
      sender: fromUserId,
      recipient: toUserId,
      content: message || "",
      fichiers: fichiers || [],
      time: new Date().toISOString(),
      lu: 0, // par défaut non lu
    };

    // Envoi du message aux deux utilisateurs (expéditeur et destinataire)
    io.to(toUserId.toString()).emit("receive-private-message", payload);
    io.to(fromUserId.toString()).emit("receive-private-message", payload);

    // ➕ Rafraîchir la liste des correspondants (WhatsApp-style)
    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      lastMessage: message || "[fichier]",
      time: payload.time,
      lu: 0, // non lu pour le destinataire
    });

    io.to(fromUserId.toString()).emit("update-correspondant-list", {
      userId: toUserId,
      lastMessage: message || "[fichier]",
      time: payload.time,
      lu: 1, // lu automatiquement pour l’expéditeur
    });

    console.log(
      `[Chat privé] ${fromUserId} → ${toUserId} : ${
        message || fichiers?.map((f) => f.extension).join(", ")
      }`
    );
  });

  // --- Statut "écrit..." (typing) ---
  socket.on("typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;
    io.to(toUserId.toString()).emit("user-typing", { fromUserId });
    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      typing: true,
    });
  });

  socket.on("stop-typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;
    io.to(toUserId.toString()).emit("user-stop-typing", { fromUserId });
    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      typing: false,
    });
  });

  // --- Lecture des messages ---
  socket.on("mark-messages-read", ({ fromUserId, toUserId }) => {
    if (!fromUserId || !toUserId) return;

    console.log(`[Lecture] ${fromUserId} a lu les messages de ${toUserId}`);

    // Notifie l'expéditeur que ses messages ont été lus
    io.to(toUserId.toString()).emit("messages-read", {
      byUserId: fromUserId,
    });

    // Rafraîchit les listes pour les deux utilisateurs
    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      lu: 1,
    });
    io.to(fromUserId.toString()).emit("update-correspondant-list", {
      userId: toUserId,
      lu: 1,
    });
  });

  // --- Broadcast global (ex: annonces système) ---
  socket.on("broadcast-message", (message) => {
    const payload = { content: message, time: new Date().toISOString() };
    io.emit("receive-broadcast-message", payload);
    console.log(`[Broadcast] ${message}`);
  });

  // --- Chat public (fallback) ---
  socket.on("new-message", (msg) => {
    socket.broadcast.emit("new-message", msg);
  });

  // --- Commentaires publics (posts, actus, etc.) ---
  socket.on("new-comment", (comment) => {
    io.emit("new-comment", comment);
  });

  // --- Suppression / édition de messages ---
  socket.on("delete-message", (messageId) => {
    io.emit("delete-message", messageId);
    console.log(`[Suppression message] ID: ${messageId}`);
  });

  socket.on("edit-message", (updatedMessage) => {
    io.emit("edit-message", updatedMessage);
    console.log(`[Édition message]`, updatedMessage);
  });

  // --- Envoi de fichiers directs (binaire ou base64) ---
  socket.on("send-file", ({ toUserId, fromUserId, file, fileName, mimeType }) => {
    if (!toUserId || !fromUserId || !file) return;

    const payload = {
      sender: fromUserId,
      recipient: toUserId,
      fichier: file,
      fileName,
      mimeType,
      time: new Date().toISOString(),
      lu: 0,
    };

    io.to(toUserId.toString()).emit("receive-file", payload);
    io.to(fromUserId.toString()).emit("receive-file", payload);

    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      lastMessage: `[fichier: ${fileName}]`,
      time: payload.time,
      lu: 0,
    });

    io.to(fromUserId.toString()).emit("update-correspondant-list", {
      userId: toUserId,
      lastMessage: `[fichier: ${fileName}]`,
      time: payload.time,
      lu: 1,
    });

    console.log(`[Chat fichier] ${fromUserId} → ${toUserId} : ${fileName}`);
  });
};
