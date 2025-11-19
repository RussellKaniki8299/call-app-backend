module.exports = function registerNotificationHandlers(io, socket, users) {
  // Notifications envoyées par le front
  socket.on("new-notification", ({ toUserId, type, payload }) => {
    const socketId = users[toUserId];
    if (socketId) {
      io.to(socketId).emit("new-notification", { type, payload });
      console.log(`[Notification] Envoyée à user ${toUserId} | type: ${type}`);
    } else {
      console.log(`[Notification] User ${toUserId} non connecté`);
    }
  });

  // Mise à jour des amis
  socket.on("update-amis", (data) => {
    if (data?.toUserId) {
      const socketId = users[data.toUserId];
      if (socketId) {
        io.to(socketId).emit("update-amis");
        console.log(`[Amis] Update envoyé à user ${data.toUserId}`);
      } else {
        console.log(`[Amis] User ${data.toUserId} non connecté`);
      }
    } else {
      io.emit("update-amis");
      console.log(`[Amis] Update envoyé à tous les utilisateurs`);
    }
  });
};
