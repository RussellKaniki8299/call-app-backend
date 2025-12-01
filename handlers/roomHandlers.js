module.exports = function registerRoomHandlers(io, socket, rooms, users) {

  // --- Rejoindre une room ---
  socket.on("join-room", ({ roomId, userInfo, isCreator }) => {
    if (!roomId) return;

    if (!rooms[roomId]) rooms[roomId] = {};

    // Définir l'état initial du micro : créateur actif, participants désactivés
    rooms[roomId][socket.id] = {
      ...userInfo,
      micOn: isCreator ? true : false,
      isCreator: !!isCreator
    };

    socket.join(roomId);
    console.log(`👤 ${userInfo?.prenom || "Utilisateur"} rejoint ${roomId}`);

    // Notifier les autres participants
    socket.to(roomId).emit("user-joined", { userId: socket.id, userInfo: rooms[roomId][socket.id] });

    // Envoyer la liste des participants existants au nouvel arrivant
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));

    socket.emit("existing-users", existingUsers);
  });

  // --- Quitter une room ---
  socket.on("leave-room", ({ roomId }) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][socket.id]) return;

    delete rooms[roomId][socket.id];
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", socket.id);
    console.log(`🚪 ${socket.id} quitte ${roomId}`);

    if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
  });

  // --- Offres WebRTC ---
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // --- Gestion du micro en temps réel ---
  socket.on("mic-toggle", ({ roomId, micOn }) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][socket.id]) return;

    // Mettre à jour l'état du micro
    rooms[roomId][socket.id].micOn = micOn;

    // Notifier les autres participants
    socket.to(roomId).emit("mic-toggle", { userId: socket.id, micOn });
  });

};
