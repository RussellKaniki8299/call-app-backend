module.exports = function registerChatHandlers(io, socket, users) {
  // Rejoindre sa "room personnelle"
  socket.on("join-user", (userId) => {
    if (!userId) return;
    socket.join(userId.toString());
    console.log(`[Chat] ${socket.id} rejoint la room user ${userId}`);
  });

  // Message privé
  socket.on("send-private-message", ({ toUserId, fromUserId, message }) => {
    if (!toUserId || !fromUserId || !message) return;

    const payload = {
      sender: fromUserId,
      recipient: toUserId,
      content: message,
      time: new Date().toISOString(),
    };

    io.to(toUserId.toString()).emit("receive-private-message", payload);
    io.to(fromUserId.toString()).emit("receive-private-message", payload);
    console.log(`[Chat privé] ${fromUserId} → ${toUserId} : ${message}`);
  });

  // Broadcast global
  socket.on("broadcast-message", (message) => {
    const payload = { content: message, time: new Date().toISOString() };
    io.emit("receive-broadcast-message", payload);
    console.log(`[Broadcast] ${message}`);
  });

  // Chat public (ancien)
  socket.on("new-message", (msg) => {
    socket.broadcast.emit("new-message", msg);
  });

  // Commentaires
  socket.on("new-comment", (comment) => {
    io.emit("new-comment", comment);
  });

  // Suppression / édition
  socket.on("delete-message", () => {
    io.emit("delete-message");
  });

  socket.on("edit-message", (content) => {
    io.emit("edit-message", content);
  });
};
