module.exports = function registerRoomHandlers(io, socket, rooms) {

  // Stockage mémoire des messages utilisateurs par room
  const roomMessages = {};

  // =========================
  // JOIN ROOM
  // =========================
  socket.on("join-room", ({ roomId, userInfo, microOn }) => {
    if (!roomId || !userInfo) return;

    if (!rooms[roomId]) rooms[roomId] = {};
    if (!roomMessages[roomId]) roomMessages[roomId] = [];

    const micState = typeof microOn === "boolean" ? microOn : true;

    rooms[roomId][socket.id] = {
      ...userInfo,
      microOn: micState,
    };

    socket.join(roomId);

    console.log(`${userInfo?.prenom || "Utilisateur"} rejoint ${roomId}`);

    // --- Utilisateurs existants ---
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({
        userId: id,
        userInfo: info,
      }));

    socket.emit("existing-users", existingUsers);

    // --- Historique des messages utilisateurs ---
    socket.emit("room-history", roomMessages[roomId]);

    // --- Notifier les autres (toast) ---
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      message: `${userInfo?.prenom || "Utilisateur"} a rejoint la room`
    });

    // --- Nombre de participants ---
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

    console.log(`${userId} quitte ${roomId}`);

    // --- Notification pour toast ---
    socket.to(roomId).emit("user-left", {
      userId,
      message: `${userInfo?.prenom || "Utilisateur"} a quitté la room`
    });

    // --- Nombre de participants ---
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
  // WEBRTC
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

  socket.on("call-cancelled", ({ to }) => {
    if (!to) return;
    io.to(to).emit("call-cancelled", { from: socket.id });
  });

  socket.on("call-cancelled", ({ to }) => {
    if (!to) return;
    io.to(to).emit("call-cancelled", { from: socket.id });
  });

  socket.on("call-rejected", ({ to }) => {
    if (!to) return;
    io.to(to).emit("call-rejected", { from: socket.id });
  });

  socket.on("call-ended", ({ to }) => {
    if (!to) return;

    io.to(to).emit("call-ended", {
      from: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // =========================
  // CHAT
  // =========================
  socket.on("room-message", ({ senderId, roomId, message, files, user }) => {
    if (!rooms[roomId] || !rooms[roomId][socket.id]) return;

    const payload = {
      type: "user",
      roomId,
      message: message || "",
      files: files || [],
      sender: {
        id: senderId,
        nom: user?.nom,
        prenom: user?.prenom,
        avatar: user?.avatar,
      },
      createdAt: new Date().toISOString(),
    };

    // --- Stocker le message pour l'historique ---
    roomMessages[roomId].push(payload);

    io.to(roomId).emit("room-message", payload);
  });
};
