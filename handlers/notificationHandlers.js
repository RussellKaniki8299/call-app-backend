module.exports = function registerNotificationHandlers(io, socket, users) {
  socket.on("internal-notify", ({ toUserId, type, payload, count }) => {
    const socketId = users[toUserId];

    console.log("Notification traitée dans le handler :", {
      toUserId,
      type,
      payload,
      count
    });

    if (socketId) {
      io.to(socketId).emit("new-notification", {
        type,
        payload,
        count,
      });

      console.log(
        `[Notification] ➜ envoyée à user ${toUserId} | type: ${type} | count: ${count}`
      );
    } else {
      console.log(`[Notification] user ${toUserId} non connecté`);
    }
  });
};
