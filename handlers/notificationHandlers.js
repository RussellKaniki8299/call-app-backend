module.exports = function registerNotificationHandlers(io, socket, users) {

  // -------------------- Notifications classiques --------------------
  socket.on("new-notification", ({ toUserId, type, payload }) => {
    const socketId = users[toUserId];
    if (socketId) {
      io.to(socketId).emit("new-notification", { type, payload });
      console.log(`[Notification] Envoyée à user ${toUserId} | type: ${type}`);
    } else {
      console.log(`[Notification] User ${toUserId} non connecté`);
    }
  });

};
