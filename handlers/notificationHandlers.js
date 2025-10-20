module.exports = function registerNotificationHandlers(io, socket, users) {
  socket.on("new-notification", ({ toUserId }) => {
    if (toUserId) io.to(toUserId.toString()).emit("new-notification");
  });

  socket.on("update-amis", (data) => {
    if (data?.toUserId) io.to(data.toUserId.toString()).emit("update-amis");
    else io.emit("update-amis");
  });
};
