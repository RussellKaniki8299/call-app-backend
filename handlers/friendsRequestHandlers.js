module.exports = function registerFriendsRequestHandlers(io, socket, users) {
  socket.on("new-friend-request", ({ toUserId, count }) => {
    const socketId = users[toUserId];

    console.log("Demande reçue :", { toUserId, count });

    if (socketId) {
      io.to(socketId).emit("new-friend-request", { count });
      console.log(`[Demande FRONT] -> envoyée à user ${toUserId} | count: ${count}`);
    } else {
      console.log(`[Demande FRONT] user ${toUserId} non connecté`);
    }
  });
};
