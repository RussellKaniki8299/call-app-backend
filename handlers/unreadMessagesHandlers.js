module.exports = function registerUnreadMessagesHandlers(io, socket, users) {

  socket.on("unread-messages-count", ({ toUserId, unread }) => {
    const socketId = users[toUserId];

    console.log("Messages non lus :", { toUserId, unread });

    if (socketId) {
      io.to(socketId).emit("unread-messages-count", { unread });
      console.log(`[Unread Messages] envoyé à user ${toUserId} : ${unread}`);
    }
  });

};
