module.exports = function registerRoomHandlers(io, socket, rooms, users) {

  const roomMessages = {};
  const cleanupTimers = {};
  const CLEANUP_DELAY = 30 * 60 * 1000;
  const MAX_PARTICIPANTS = 10;

  // --- Rejoindre une room ---
  socket.on("join-room", ({ roomId, userInfo, microOn }) => {
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

    // Par défaut microOn = true si non envoyé
    const microState = typeof microOn === "boolean" ? microOn : true;

    rooms[roomId][socket.id] = {
      ...userInfo,
      microOn: microState
    };
    socket.join(roomId);

    console.log(`${userInfo?.prenom || "Utilisateur"} rejoint ${roomId} (micro: ${microState})`);

    // Nombre de participants
    const participantCount = Object.keys(rooms[roomId]).length;
    io.to(roomId).emit("room-participant-count", participantCount);

    // Message système
    const joinPayload = {
      type: "system",
      message: `${userInfo?.prenom || "Utilisateur"} a rejoint la room`,
      user: rooms[roomId][socket.id],
      createdAt: new Date().toISOString(),
    };
    io.to(roomId).emit("room-message", joinPayload);

    // Utilisateurs existants
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));
    socket.emit("existing-users", existingUsers);

    // Historique complet
    socket.emit("room-history", roomMessages[roomId]);
  });

  // --- Quitter une room ---
  const handleLeave = (roomId, userId) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][userId]) return;

    const userInfo = rooms[roomId][userId];
    delete rooms[roomId][userId];
    socket.leave(roomId);

    // Message système
    const leavePayload = {
      type: "system",
      message: `${userInfo?.prenom || "Utilisateur"} a quitté la room`,
      user: userInfo,
      createdAt: new Date().toISOString(),
    };
    io.to(roomId).emit("room-message", leavePayload);

    // Nombre de participants
    const participantCount = Object.keys(rooms[roomId]).length;
    io.to(roomId).emit("room-participant-count", participantCount);

    console.log(`${userId} quitte ${roomId}`);

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

  // --- Microphone update ---
  socket.on("update-micro", ({ roomId, microOn }) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][socket.id]) return;

    rooms[roomId][socket.id].microOn = microOn;

    io.to(roomId).emit("micro-updated", {
      userId: socket.id,
      microOn
    });

    console.log(`${rooms[roomId][socket.id].prenom || "Utilisateur"} micro: ${microOn}`);
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

  // --- Chat ---
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

    roomMessages[roomId].push(payload);
    io.to(roomId).emit("room-message", payload);
  });
};
