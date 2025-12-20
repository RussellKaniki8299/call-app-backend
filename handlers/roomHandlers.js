module.exports = function registerRoomHandlers(io, socket, rooms, users) {

  const roomMessages = {};       // roomId -> [messages]
  const cleanupTimers = {};      // roomId -> timeout
  const CLEANUP_DELAY = 30 * 60 * 1000; // 30 minutes
  const MAX_PARTICIPANTS = 10;   // limite de participants par room

  // --- Rejoindre une room ---
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!roomId) return;

    if (!rooms[roomId]) rooms[roomId] = {};
    if (!roomMessages[roomId]) roomMessages[roomId] = [];

    const currentParticipants = Object.keys(rooms[roomId]).length;
    if (currentParticipants >= MAX_PARTICIPANTS) {
      socket.emit("room-full", { roomId, max: MAX_PARTICIPANTS });
      return;
    }

    if (cleanupTimers[roomId]) {
      clearTimeout(cleanupTimers[roomId]);
      delete cleanupTimers[roomId];
    }

    // Ajouter le participant
    rooms[roomId][socket.id] = userInfo || {};
    socket.join(roomId);

    console.log(`${userInfo?.prenom || "Utilisateur"} rejoint ${roomId}`);

    // Envoyer le nombre de participants à tous
    const participantCount = Object.keys(rooms[roomId]).length;
    io.to(roomId).emit("room-participant-count", participantCount);

    // Notifier la room avec un message système
    const joinPayload = {
      type: "system",
      message: `${userInfo?.prenom || "Utilisateur"} a rejoint la room`,
      user: userInfo,
      createdAt: new Date().toISOString(),
    };
    io.to(roomId).emit("room-message", joinPayload);

    // Envoyer les utilisateurs existants
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));
    socket.emit("existing-users", existingUsers);

    // Envoyer l'historique complet
    socket.emit("room-history", roomMessages[roomId]);
  });

  // --- Quitter une room ---
  const handleLeave = (roomId, userId) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][userId]) return;

    const userInfo = rooms[roomId][userId];
    delete rooms[roomId][userId];
    socket.leave(roomId);

    // Envoyer un message système
    const leavePayload = {
      type: "system",
      message: `${userInfo?.prenom || "Utilisateur"} a quitté la room`,
      user: userInfo,
      createdAt: new Date().toISOString(),
    };
    io.to(roomId).emit("room-message", leavePayload);

    // Mettre à jour le nombre de participants
    const participantCount = Object.keys(rooms[roomId]).length;
    io.to(roomId).emit("room-participant-count", participantCount);

    console.log(`${userId} quitte ${roomId}`);

    // Dernier participant → planifier le nettoyage
    if (participantCount === 0) {
      cleanupTimers[roomId] = setTimeout(() => {
        delete rooms[roomId];
        delete roomMessages[roomId];
        delete cleanupTimers[roomId];
        console.log(`Room ${roomId} nettoyée`);
      }, CLEANUP_DELAY);
    }
  };

  socket.on("leave-room", ({ roomId }) => handleLeave(roomId, socket.id));
  socket.on("disconnect", () => {
    for (const roomId of Object.keys(rooms)) {
      if (rooms[roomId][socket.id]) {
        handleLeave(roomId, socket.id);
      }
    }
  });

  // --- WebRTC signaling ---
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // --- Message dans une room ---
  socket.on("room-message", ({ senderId, roomId, message, files, user }) => {
    if (!roomId || !rooms[roomId]) return;
    if (!rooms[roomId][socket.id]) return;
    if (!senderId) return;

    const payload = {
      type: "user",
      roomId,
      message: message || "",
      files: files || [],
      sender: {
        id: senderId,
        nom: user?.nom,
        prenom: user?.prenom,
        photo: user?.photo,
      },
      createdAt: new Date().toISOString(),
    };

    // Stocker le message
    roomMessages[roomId].push(payload);

    io.to(roomId).emit("room-message", payload);
  });
};
