module.exports.registerNotificationHandlers = function (io, socket, users) {
  // Notifications envoyées par le front
  socket.on("new-notification", ({ toUserId, type, payload }) => {
    if (toUserId) {
      const socketId = users[toUserId];
      if (socketId) io.to(socketId).emit("new-notification", { type, payload });
    }
  });

  // Mise à jour des amis
  socket.on("update-amis", (data) => {
    if (data?.toUserId) {
      const socketId = users[data.toUserId];
      if (socketId) io.to(socketId).emit("update-amis");
    } else {
      io.emit("update-amis");
    }
  });
};
