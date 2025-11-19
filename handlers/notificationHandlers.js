module.exports = function registerNotificationHandlers(io, socket, users) {
  socket.on("new-notification", ({ toUserId, type, payload, count }) => {
    const socketId = users[toUserId];

    console.log("📨 Notification reçue du FRONT :", { toUserId, type, payload, count });

    if (socketId) {
      io.to(socketId).emit("new-notification", { type, payload, count });
      console.log(`[Notification FRONT] ➜ envoyée à user ${toUserId} | type: ${type} | count: ${count}`);
    } else {
      console.log(`[Notification FRONT] user ${toUserId} non connecté`);
    }
  });
};
