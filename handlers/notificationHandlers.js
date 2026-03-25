module.exports = function registerNotificationHandlers(io, socket, users) {
  socket.on("new-notification", ({ toUserId, count }) => {
    const socketId = users[toUserId];

    console.log("Notification reçue du FRONT :", { toUserId, count });

    if (socketId) {
      io.to(socketId).emit("new-notification", { count });
      console.log(`[Notification FRONT] -> envoyée à user ${toUserId} | count: ${count}`);
    } else {
      console.log(`[Notification FRONT] user ${toUserId} non connecté`);
    }
  });
};
