module.exports = function registerRoomHandlers(io, socket, rooms) {

  // =========================
  // Mémoire : messages par room
  // =========================
  const roomMessages = {};

  // =========================
  // JOIN ROOM
  // =========================
  socket.on("join-room", ({ roomId, userInfo, microOn }) => {
    if (!roomId || !userInfo) return;

    if (!rooms[roomId]) rooms[roomId] = {};
    if (!roomMessages[roomId]) roomMessages[roomId] = [];

    const micState = typeof microOn === "boolean" ? microOn : true;

    // Enregistrer l’utilisateur
    rooms[roomId][socket.id] = {
      id: socket.id,
      prenom: userInfo.prenom,
      nom: userInfo.nom,
      avatar: userInfo.avatar || "default.png",
      microOn: micState,
    };

    socket.join(roomId);

    console.log(`👤 ${userInfo.prenom} rejoint ${roomId}`);

    // =========================
    // Utilisateurs existants
    // =========================
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({
        userId: id,
        userInfo: info,
      }));

    socket.emit("existing-users", existingUsers);

    // =========================
    // Historique des messages
    // =========================
    socket.emit("room-history", roomMessages[roomId]);

    // =========================
    // Notifier les autres (user-joined)
    // =========================
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      userInfo: rooms[roomId][socket.id],
    });

    // =========================
    // Message système JOIN
    // =========================
    const joinMessage = {
      id: Date.now(),
      type: "system",
      text: `${userInfo.prenom} a rejoint la room`,
      files: [],
      user: {
        id: socket.id,
        prenom: userInfo.prenom,
        nom: userInfo.nom,
        avatar: userInfo.avatar || "default.png",
      },
      createdAt: new Date().toISOString(),
    };

    roomMessages[roomId].push(joinMessage);
    io.to(roomId).emit("room-message", joinMessage);

    // =========================
    // Nombre de participants
    // =========================
    io.to(roomId).emit(
      "room-participant-count",
      Object.keys(rooms[roomId]).length
    );
  });

  // =========================
  // LEAVE / DISCONNECT
  // =========================
  const handleLeave = (roomId, userId) => {
    if (!rooms[roomId] || !rooms[roomId][userId]) return;

    const userInfo = rooms[roomId][userId];
    delete rooms[roomId][userId];
    socket.leave(roomId);

    console.log(`🚪 ${userInfo.prenom} quitte ${roomId}`);

    // Message système LEAVE
    const leaveMessage = {
      id: Date.now(),
      type: "system",
      text: `${userInfo.prenom} a quitté la room`,
      files: [],
      user: {
        id: userId,
        prenom: userInfo.prenom,
        nom: userInfo.nom,
        avatar: userInfo.avatar || "default.png",
      },
      createdAt: new Date().toISOString(),
    };

    roomMessages[roomId].push(leaveMessage);
    io.to(roomId).emit("room-message", leaveMessage);

    socket.to(roomId).emit("user-left", userId);

    io.to(roomId).emit(
      "room-participant-count",
      Object.keys(rooms[roomId]).length
    );
  };

  socket.on("leave-room", ({ roomId }) => {
    handleLeave(roomId, socket.id);
  });

  socket.on("disconnect", () => {
    for (const roomId of Object.keys(rooms)) {
      if (rooms[roomId][socket.id]) {
        handleLeave(roomId, socket.id);
      }
    }
  });

  // =========================
  // MICROPHONE
  // =========================
  socket.on("update-micro", ({ roomId, microOn }) => {
    if (!rooms[roomId] || !rooms[roomId][socket.id]) return;

    rooms[roomId][socket.id].microOn = microOn;

    io.to(roomId).emit("micro-updated", {
      userId: socket.id,
      microOn,
    });
  });

  // =========================
  // WEBRTC SIGNALING
  // =========================
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // =========================
  // CHAT MESSAGE
  // =========================
  socket.on("room-message", ({ senderId, roomId, message, files, user }) => {
    if (!rooms[roomId] || !rooms[roomId][socket.id]) return;

    const payload = {
      id: Date.now(),
      type: "user",
      text: message || "",
      files: files || [],
      user: {
        id: senderId,
        prenom: user?.prenom,
        nom: user?.nom,
        avatar: user?.avatar || "default.png",
      },
      createdAt: new Date().toISOString(),
    };

    roomMessages[roomId].push(payload);
    io.to(roomId).emit("room-message", payload);
  });
};
