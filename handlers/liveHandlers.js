module.exports = function registerLiveHandlers(io, socket, lives, users) {
  
  // rejoindre un live
  socket.on("join-live", ({ liveId, userInfo }) => {
    if (!liveId) return;

    if (!lives[liveId]) lives[liveId] = {};

    lives[liveId][socket.id] =
      userInfo || { prenom: "Inconnu", avatar: "default.png" };

    socket.join(liveId);

    socket.to(liveId).emit("user-joined", {
      userId: socket.id,
      userInfo,
    });

    const existingUsers = Object.entries(lives[liveId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({
        userId: id,
        userInfo: info,
      }));

    socket.emit("existing-users", existingUsers);
  });

  // quitter un live
  socket.on("leave-live", ({ liveId }) => {
    if (!liveId || !lives[liveId] || !lives[liveId][socket.id]) return;

    delete lives[liveId][socket.id];

    socket.leave(liveId);

    socket.to(liveId).emit("live-user-left", {
      userId: socket.id,
    });

    if (Object.keys(lives[liveId]).length === 0) {
      delete lives[liveId];
    }
  });

  // WebRTC
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
