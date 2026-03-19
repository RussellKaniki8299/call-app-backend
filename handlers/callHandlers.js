module.exports = function registerCallHandlers(io, socket, users) {
  // Enregistrer utilisateur
  socket.on("register-user", (userId) => {
    if (!userId) return;
    users[userId] = socket.id;
    console.log(`🟢 Utilisateur ${userId} enregistré : ${socket.id}`);
  });

  // Appeler un utilisateur
  socket.on("call-user", ({ fromUser, toUser, callType, roomId }) => {
    if (!fromUser || !toUser || !callType || !roomId) {
      socket.emit("call-error", { message: "Paramètres invalides." });
      return;
    }

    const targetSocket = users[toUser];
    if (!targetSocket) {
      socket.emit("call-error", { message: "L'utilisateur est hors ligne." });
      return;
    }

    io.to(targetSocket).emit("incoming-call", { fromUser, callType, roomId });
    console.log(`📞 Appel ${callType} de ${fromUser.id || fromUser} vers ${toUser}`);
  });

  socket.on("accept-call", ({ fromUserId, toUserId, roomId, callType }) => {
    const callerSocket = users[fromUserId];
    if (callerSocket) {
      io.to(callerSocket).emit("call-accepted", { roomId, callType });
      console.log(`✅ Appel ${callType} accepté par ${toUserId}`);
    }
  });

  socket.on("reject-call", ({ fromUserId, toUserId }) => {
    const callerSocket = users[fromUserId];
    if (callerSocket) {
      io.to(callerSocket).emit("call-rejected", { toUserId });
      console.log(`❌ Appel rejeté par ${toUserId}`);
    }
  });

  socket.on("cancel-call", ({ toUserId }) => {
    const targetSocket = users[toUserId];
    if (targetSocket) {
      io.to(targetSocket).emit("call-cancelled");
      console.log(`🚫 Appel annulé vers ${toUserId}`);
    }
  });
};
