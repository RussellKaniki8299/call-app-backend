module.exports = function registerRoomHandlers(io, socket, rooms) {

  // Historique des messages par room
  const roomMessages = {};

  // --- Rejoindre une room ---
  socket.on("join-room", ({ roomId, userInfo = {}, microOn }) => {
    if (!roomId) return;

    if (!rooms[roomId]) rooms[roomId] = {};
    if (!roomMessages[roomId]) roomMessages[roomId] = [];

    // microOn facultatif → true par défaut
    const micState = typeof microOn === "boolean" ? microOn : true;

    rooms[roomId][socket.id] = {
      ...userInfo,
      microOn: micState,
    };

    socket.join(roomId);

    console.log(
      `${userInfo?.prenom || "Utilisateur"} rejoint ${roomId} (micro: ${micState})`
    );

    // --- utilisateurs existants ---
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({
        userId: id,
        userInfo: info,
      }));

    // envoyer les users existants au nouveau
    socket.emit("existing-users", existingUsers);

    // notifier les autres
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      userInfo: rooms[roomId][socket.id],
    });

    // --- envoyer l'historique des messages ---
    socket.emit("room-history", roomMessages[roomId]);

    // message système (optionnel)
    io.to(roomId).emit("room-message", {
      type: "system",
      message: `${userInfo?.prenom || "Utilisateur"} a rejoint la room`,
      user: rooms[roomId][socket.id],
      createdAt: new Date().toISOString(),
    });
  });

  // --- Quitter une room ---
  const handleLeave = (roomId, userId) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][userId]) return;

    const userInfo = rooms[roomId][userId];
    delete rooms[roomId][userId];

    socket.leave(roomId);

    io.to(roomId).emit("user-left", userId);

    io.to(roomId).emit("room-message", {
      type: "system",
      message: `${userInfo?.prenom || "Utilisateur"} a quitté la room`,
      user: userInfo,
      createdAt: new Date().toISOString(),
    });

    // si room vide → nettoyage simple
    if (Object.keys(rooms[roomId]).length === 0) {
      delete rooms[roomId];
      delete roomMessages[roomId];
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

  // --- Mise à jour micro ---
  socket.on("update-micro", ({ roomId, microOn }) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][socket.id]) return;

    rooms[roomId][socket.id].microOn = microOn;

    io.to(roomId).emit("micro-updated", {
      userId: socket.id,
      microOn,
    });

    console.log(
      `${rooms[roomId][socket.id].prenom || "Utilisateur"} micro: ${microOn}`
    );
  });

  // --- WebRTC ---
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // --- Messages ---
  socket.on("room-message", ({ senderId, roomId, message, files, user }) => {
    if (!roomId || !rooms[roomId] || !senderId) return;

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

    roomMessages[roomId].push(payload);
    io.to(roomId).emit("room-message", payload);
  });
};
