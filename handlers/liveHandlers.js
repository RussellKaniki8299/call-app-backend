module.exports = function registerLiveHandlers(io, socket, liveRooms = {}, users = {}) {

  // 1️⃣ CRÉER UN LIVE
  socket.on("live-create", ({ liveId, streamerId, title, type }) => {
    if (!liveId || !streamerId) return;

    if (!liveRooms[liveId]) {
      liveRooms[liveId] = {
        streamer: streamerId,
        users: {},
        info: { title, type }
      };
    }

    // Le streamer rejoint la room
    socket.join(liveId);
    liveRooms[liveId].users[socket.id] = streamerId;
    users[socket.id] = { id: streamerId };

    console.log(`LIVE DÉMARRÉ : ${liveId} par ${streamerId}`);

    io.to(liveId).emit("live-started", {
      liveId,
      streamerId,
      title,
      type
    });
  });

  // 2️⃣ REJOINDRE UN LIVE (WebRTC ready)
  socket.on("join-live", ({ liveId, userInfo }) => {
    if (!liveRooms[liveId]) {
      socket.emit("live-error", { message: "Live introuvable." });
      return;
    }

    socket.join(liveId);
    liveRooms[liveId].users[socket.id] = userInfo.id;
    users[socket.id] = userInfo;

    console.log(`👤 User ${userInfo.id} rejoint le live ${liveId}`);

    // Informer les autres qu’un nouvel utilisateur est arrivé
    Object.keys(liveRooms[liveId].users)
      .filter(id => id !== socket.id)
      .forEach(id => {
        io.to(id).emit("user-joined", { userId: socket.id, userInfo });
      });

    // Envoyer la liste des participants existants au nouvel utilisateur
    const existingUsers = Object.keys(liveRooms[liveId].users)
      .filter(id => id !== socket.id)
      .map(id => ({ userId: id, userInfo: users[id] }));

    socket.emit("existing-users", existingUsers);
  });

  // 3️⃣ RELAY WEBRTC
  socket.on("offer-live", ({ offer, to }) => {
    io.to(to).emit("offer-live", { offer, from: socket.id });
  });

  socket.on("answer-live", ({ answer, to }) => {
    io.to(to).emit("answer-live", { answer, from: socket.id });
  });

  socket.on("ice-candidate-live", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate-live", { candidate, from: socket.id });
  });

  // 4️⃣ QUITTER UN LIVE
  socket.on("leave-live", ({ liveId }) => {
    socket.leave(liveId);
    const userInfo = users[socket.id];
    delete users[socket.id];

    if (liveRooms[liveId]?.users[socket.id]) {
      delete liveRooms[liveId].users[socket.id];
    }

    io.to(liveId).emit("user-left", socket.id);

    // Si plus personne → supprimer la room
    if (liveRooms[liveId] && Object.keys(liveRooms[liveId].users).length === 0) {
      delete liveRooms[liveId];
      console.log(`Live supprimé : ${liveId}`);
    }
  });

  // 5️⃣ ARRÊTER LE LIVE
  socket.on("live-stop", ({ liveId, streamerId }) => {
    if (!liveRooms[liveId] || liveRooms[liveId].streamer !== streamerId) return;

    io.to(liveId).emit("live-ended", { liveId });
    delete liveRooms[liveId];
    console.log(`Live arrêté : ${liveId}`);
  });

  // 6️⃣ GESTION DE LA DÉCONNEXION
  socket.on("disconnect", () => {
    for (const liveId in liveRooms) {
      if (liveRooms[liveId].users[socket.id]) {
        const userInfo = users[socket.id];
        delete liveRooms[liveId].users[socket.id];
        delete users[socket.id];

        io.to(liveId).emit("user-left", socket.id);

        if (Object.keys(liveRooms[liveId].users).length === 0) {
          delete liveRooms[liveId];
          console.log(`Live supprimé (plus personne) : ${liveId}`);
        }
      }
    }
  });
};
