module.exports = function registerLiveHandlers(io, socket, liveSessions) {
  // liveSessions = { [roomId]: { broadcaster: socketId, viewers: { socketId: userInfo } } }

  // ---------------- START LIVE ----------------
  socket.on("start-live", ({ roomId, userInfo }) => {
    if (!roomId) return;

    // Créer la session live si elle n'existe pas
    if (!liveSessions[roomId]) liveSessions[roomId] = { broadcaster: null, viewers: {} };
    liveSessions[roomId].broadcaster = socket.id;
    socket.join(roomId);

    console.log(`🎥 Live démarré dans ${roomId} par ${userInfo?.prenom || socket.id}`);

    // Notifier les futurs spectateurs
    socket.to(roomId).emit("live-started", { broadcasterId: socket.id, userInfo });
  });

  // ---------------- JOIN LIVE ----------------
  socket.on("join-live", ({ roomId, userInfo }) => {
    const session = liveSessions[roomId];
    if (!session || !session.broadcaster) return;

    // Ajouter spectateur
    session.viewers[socket.id] = userInfo || { prenom: "Spectateur" };
    socket.join(roomId);

    console.log(`👀 ${userInfo?.prenom || socket.id} rejoint le live de ${roomId}`);

    // Prévenir le broadcaster qu'un nouveau spectateur arrive
    io.to(session.broadcaster).emit("new-spectator", { spectatorId: socket.id, userInfo });
  });

  // ---------------- END LIVE ----------------
  socket.on("end-live", ({ roomId }) => {
    const session = liveSessions[roomId];
    if (!session || session.broadcaster !== socket.id) return;

    // Notifier les spectateurs que le live est terminé
    socket.to(roomId).emit("live-ended");

    // Supprimer la session
    delete liveSessions[roomId];

    console.log(`🛑 Live terminé dans ${roomId} par ${socket.id}`);
  });

  // ---------------- WebRTC SIGNALING ----------------
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {
    for (const roomId in liveSessions) {
      const session = liveSessions[roomId];

      // Si le broadcaster part, fin du live
      if (session.broadcaster === socket.id) {
        socket.to(roomId).emit("live-ended");
        delete liveSessions[roomId];
        console.log(`🛑 Live terminé dans ${roomId} (broadcaster déconnecté)`);
      } else if (session.viewers[socket.id]) {
        // Retirer le spectateur
        delete session.viewers[socket.id];
        socket.to(session.broadcaster).emit("spectator-left", socket.id);
        console.log(`🚪 Spectateur ${socket.id} a quitté le live ${roomId}`);
      }
    }
  });
};
