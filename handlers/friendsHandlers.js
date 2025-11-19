module.exports = function registerFriendsHandlers(io, socket, users) {

  // Mise à jour de la liste d’amis
  socket.on("update-friends", (data) => {
    if (data?.toUserId) {
      const socketId = users[data.toUserId];
      if (socketId) {
        io.to(socketId).emit("update-friends");
        console.log(`[Friends] Update envoyé à user ${data.toUserId}`);
      } else {
        console.log(`[Friends] User ${data.toUserId} non connecté`);
      }
    } else {
      io.emit("update-friends");
      console.log(`[Friends] Update envoyé à tous les utilisateurs`);
    }
  });

};
