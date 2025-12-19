module.exports = function registerRoomHandlers(io, socket, rooms, users) {

  // --- Rejoindre une room ---
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!roomId) return;

    // Créer la room si elle n'existe pas
    if (!rooms[roomId]) rooms[roomId] = {};

    // Sauvegarder les infos du user dans la room
    rooms[roomId][socket.id] = userInfo || {};

    socket.join(roomId);
    console.log(`👤 ${userInfo?.prenom || "Utilisateur"} rejoint ${roomId}`);

    // Obtenir les utilisateurs existants dans la room (sauf lui-même)
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));

    // Notifier les autres participants qu’un nouveau arrive
    socket.to(roomId).emit("user-joined", { 
      userId: socket.id, 
      userInfo: rooms[roomId][socket.id] 
    });

    // Envoyer à l’utilisateur les utilisateurs déjà présents
    socket.emit("existing-users", existingUsers);
  });

  // --- Quitter une room ---
  socket.on("leave-room", ({ roomId }) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][socket.id]) return;

    delete rooms[roomId][socket.id];
    socket.leave(roomId);

    socket.to(roomId).emit("user-left", socket.id);
    console.log(`🚪 ${socket.id} quitte ${roomId}`);

    // Supprimer la room si vide
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

  // --- Message dans une room ---
  socket.on("room-message", ({ senderId, roomId, message, file, user }) => {
    // Vérifications de base
    if (!roomId || !rooms[roomId]) return;
    if (!rooms[roomId][socket.id]) return; // Vérifie que le socket est bien dans la room
    if (!senderId) return; // Vérifie que l'ID de l'envoyeur est présent

    const payload = {
      roomId,
      message: message?.trim() || "",    // message texte
      file: file || null,                // fichier optionnel
      sender: {                          // infos de l'envoyeur
        id: senderId,                    // ID réel de l'utilisateur
        nom: user?.nom,
        prenom: user?.prenom,
        photo: user?.photo
      },
      createdAt: new Date().toISOString()
    };

    // Diffuser le message à tous les membres de la room
    io.to(roomId).emit("room-message", payload);

    console.log(`💬 Message dans ${roomId} par ${user?.prenom || "Utilisateur"}`);
  });



};
