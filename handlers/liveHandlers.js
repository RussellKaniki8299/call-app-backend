module.exports = function registerLiveHandlers(io, socket, liveRooms, users) {

  /**
   * 1. CRÉER UN LIVE
   * data = { liveId, streamerId, title, type }
   */
  socket.on("live-create", (data) => {
    const { liveId, streamerId, title, type } = data;
    if (!liveId || !streamerId) return;

    // Création de la room live si elle n’existe pas déjà
    if (!liveRooms[liveId]) {
      liveRooms[liveId] = {
        streamer: streamerId,
        users: {},
        info: { title, type }
      };
    }

    // Le streamer join la room
    socket.join(liveId);
    liveRooms[liveId].users[socket.id] = streamerId;

    console.log(`LIVE DÉMARRÉ : ${liveId} par ${streamerId}`);

    io.to(liveId).emit("live-started", {
      liveId,
      streamerId,
      title,
      type
    });
  });

  /**
   * 2. REJOINDRE UN LIVE
   * data = { liveId, userId }
   */
  socket.on("live-join", ({ liveId, userId }) => {
    if (!liveRooms[liveId]) {
      socket.emit("live-error", { message: "Live introuvable." });
      return;
    }

    socket.join(liveId);
    liveRooms[liveId].users[socket.id] = userId;

    console.log(`👤 User ${userId} rejoint le live ${liveId}`);

    io.to(liveId).emit("live-user-joined", { liveId, userId });
  });

  /**
   * 3. CHAT EN LIVE
   * data = { liveId, userId, message }
   */
  socket.on("live-message", ({ liveId, userId, message }) => {
    if (!liveRooms[liveId]) return;

    io.to(liveId).emit("live-message", {
      userId,
      message,
      timestamp: Date.now()
    });
  });

  /**
   * 4. QUITTER UN LIVE
   */
  socket.on("live-leave", ({ liveId, userId }) => {
    socket.leave(liveId);
    if (liveRooms[liveId]?.users[socket.id]) {
      delete liveRooms[liveId].users[socket.id];
    }

    console.log(`User ${userId} quitte le live ${liveId}`);

    io.to(liveId).emit("live-user-left", { userId });

    // Si plus personne dans le live → suppression
    if (Object.keys(liveRooms[liveId].users).length === 0) {
      delete liveRooms[liveId];
      console.log(`Live supprimé : ${liveId}`);
    }
  });

  /**
   * 5. ARRÊTER LE LIVE (Streamer uniquement)
   */
  socket.on("live-stop", ({ liveId, streamerId }) => {
    if (!liveRooms[liveId] || liveRooms[liveId].streamer !== streamerId) return;

    io.to(liveId).emit("live-ended", { liveId });

    console.log(`Live arrêté : ${liveId}`);

    // supprimer la room
    delete liveRooms[liveId];
  });

  /**
   * 6. Déconnexion : retirer des lives actifs
   */
  socket.on("disconnect", () => {
    for (const liveId in liveRooms) {
      if (liveRooms[liveId].users[socket.id]) {
        const userId = liveRooms[liveId].users[socket.id];
        delete liveRooms[liveId].users[socket.id];

        io.to(liveId).emit("live-user-left", { userId });

        // Si plus personne → supprimer
        if (Object.keys(liveRooms[liveId].users).length === 0) {
          delete liveRooms[liveId];
          console.log(`Live supprimé (plus personne) : ${liveId}`);
        }
      }
    }
  });
};
