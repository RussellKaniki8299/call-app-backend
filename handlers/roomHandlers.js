module.exports = function registerRoomHandlers(io, socket, rooms, users) {
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!roomId) return;

    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = userInfo || { prenom: "Inconnu", avatar: "default.png" };

    socket.join(roomId);
    console.log(`👤 ${userInfo?.prenom || "Utilisateur"} rejoint ${roomId}`);

    socket.to(roomId).emit("user-joined", { userId: socket.id, userInfo });

    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));

    socket.emit("existing-users", existingUsers);
  });

  socket.on("leave-room", ({ roomId }) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][socket.id]) return;

    delete rooms[roomId][socket.id];
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", socket.id);
    console.log(`🚪 ${socket.id} quitte ${roomId}`);

    if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });
};
