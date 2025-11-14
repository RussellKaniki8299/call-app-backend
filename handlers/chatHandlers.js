/**
 * Gestion complète des événements de chat (privé, public, fichiers, etc.)
 */
module.exports = function registerChatHandlers(io, socket, users) {

  // --- Rejoindre sa room utilisateur ---
  socket.on("join-user", (userId) => {
    if (!userId) return;
    const room = userId.toString();

    socket.join(room);
    users[userId] = users[userId] || [];
    users[userId].push(socket.id);

    console.log(`[Chat] Socket ${socket.id} rejoint la room utilisateur ${room}`);
  });

  // --- Envoi d'un message privé ---
  socket.on("send-private-message", (data) => {

    const {
      toUserId,
      fromUserId,
      message,
      fichiers,
      time,
      avatar,
      msg_id,
      preview,
      reply_to
    } = data;

    if (!toUserId || !fromUserId) return;

    const finalTime =
      time ||
      new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

    const buildPayload = (senderLabel) => ({
      msg_id: msg_id || Math.random().toString(),
      sender: senderLabel,
      senderId: fromUserId,
      recipient: toUserId,
      content: message || "",
      fichiers: fichiers || [],
      time: finalTime,
      lu: 0,
      avatar: avatar || "",
      preview: preview || false,
      reply_to: reply_to || 0
    });

    const senderPayload = buildPayload("Vous");
    const recipientPayload = buildPayload("Lui/Elle");

    console.log(`[Serveur] MP ${fromUserId} → ${toUserId}`, senderPayload);

    // --- Toujours renvoyer au SENDER directement ---
    socket.emit("receive-private-message", senderPayload);

    // --- Multi-device + room sender ---
    io.to(fromUserId.toString()).emit("receive-private-message", senderPayload);

    // --- Receiver si connecté (room) ---
    io.to(toUserId.toString()).emit("receive-private-message", recipientPayload);

    // --- Mise à jour des correspondants ---
    const lastMessagePreview =
      message ||
      (fichiers?.length
        ? `[fichier: ${fichiers.map((f) => f.name || f.fileName).join(", ")}]`
        : "");

    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      lastMessage: lastMessagePreview,
      time: finalTime,
      lu: 0
    });

    io.to(fromUserId.toString()).emit("update-correspondant-list", {
      userId: toUserId,
      lastMessage: lastMessagePreview,
      time: finalTime,
      lu: 1
    });
  });

  // --- Statut "écrit..." ---
  socket.on("typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;

    io.to(toUserId.toString()).emit("user-typing", { fromUserId });
    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      typing: true
    });
  });

  socket.on("stop-typing", ({ toUserId, fromUserId }) => {
    if (!toUserId || !fromUserId) return;

    io.to(toUserId.toString()).emit("user-stop-typing", { fromUserId });
    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      typing: false
    });
  });

  // --- Marquer messages lus ---
  socket.on("mark-messages-read", ({ fromUserId, toUserId }) => {
    if (!fromUserId || !toUserId) return;

    console.log(`[Lecture] ${fromUserId} a lu les messages de ${toUserId}`);

    io.to(toUserId.toString()).emit("messages-read", { byUserId: fromUserId });

    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      lu: 1
    });

    io.to(fromUserId.toString()).emit("update-correspondant-list", {
      userId: toUserId,
      lu: 1
    });
  });

  // --- Envoi fichier ---
  socket.on("send-file", (data) => {
    const { toUserId, fromUserId, file, fileName, mimeType, avatar, msg_id, preview, reply_to } = data;

    if (!toUserId || !fromUserId || !file) return;

    const finalTime = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    const buildPayload = (senderLabel) => ({
      msg_id: msg_id || Math.random().toString(),
      sender: senderLabel,
      senderId: fromUserId,
      recipient: toUserId,
      fichier: file,
      fileName,
      mimeType,
      time: finalTime,
      lu: 0,
      avatar: avatar || "",
      preview: preview || false,
      reply_to: reply_to || 0,
      content: ""
    });

    const senderPayload = buildPayload("Vous");
    const recipientPayload = buildPayload("Lui/Elle");

    // sender direct
    socket.emit("receive-file", senderPayload);
    // sender room (multi-device)
    io.to(fromUserId.toString()).emit("receive-file", senderPayload);
    // receiver
    io.to(toUserId.toString()).emit("receive-file", recipientPayload);

    // update lists
    const lastMessagePreview = `[fichier: ${fileName}]`;

    io.to(toUserId.toString()).emit("update-correspondant-list", {
      userId: fromUserId,
      lastMessage: lastMessagePreview,
      time: finalTime,
      lu: 0
    });

    io.to(fromUserId.toString()).emit("update-correspondant-list", {
      userId: toUserId,
      lastMessage: lastMessagePreview,
      time: finalTime,
      lu: 1
    });

    console.log(`[Chat fichier] ${fromUserId} → ${toUserId} : ${fileName}`);
  });

  // --- Broadcast global ---
  socket.on("broadcast-message", (message) => {
    const payload = { content: message, time: new Date().toISOString() };
    io.emit("receive-broadcast-message", payload);
    console.log(`[Broadcast] ${message}`);
  });

  // --- Chat public fallback ---
  socket.on("new-message", (msg) => {
    socket.broadcast.emit("new-message", msg);
  });

  // --- Commentaires publics ---
  socket.on("new-comment", (comment) => {
    io.emit("new-comment", comment);
  });

  // --- Suppression / édition ---
  socket.on("delete-message", (messageId) => {
    io.emit("delete-message", messageId);
    console.log(`[Suppression message] ID: ${messageId}`);
  });

  socket.on("edit-message", (updatedMessage) => {
    io.emit("edit-message", updatedMessage);
    console.log(`[Édition message]`, updatedMessage);
  });

};
