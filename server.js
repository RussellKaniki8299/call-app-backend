// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// --- Structures mémoire ---
// users = { userId: socketId }
// rooms = { roomId: { socketId: userInfo } }
const users = {};
const rooms = {};

io.on("connection", (socket) => {
  console.log("✅ Utilisateur connecté:", socket.id);

  // ==========================================================
  // 🔹 Enregistrement d’un utilisateur
  // ==========================================================
  socket.on("register-user", (userId) => {
    users[userId] = socket.id;
    console.log(`🟢 Utilisateur enregistré : ${userId} → ${socket.id}`);
  });

  // ==========================================================
  // 🔹 Envoi d’un appel direct à un autre utilisateur
  // ==========================================================
  socket.on("call-user", ({ fromUser, toUser, callType, roomId }) => {
    const targetSocket = users[toUser];
    if (!targetSocket) {
      socket.emit("call-error", { message: "L'utilisateur est hors ligne." });
      return;
    }

    console.log(`📞 Appel de ${fromUser.id} vers ${toUser} (${callType})`);

    // Envoi de la notification d’appel entrant
    io.to(targetSocket).emit("incoming-call", {
      fromUser,
      callType,
      roomId,
    });
  });

  // ==========================================================
  // 🔹 Acceptation d’un appel
  // ==========================================================
  socket.on("accept-call", ({ fromUserId, toUserId, roomId }) => {
    const callerSocket = users[fromUserId];
    if (callerSocket) {
      io.to(callerSocket).emit("call-accepted", { roomId });
      console.log(`✅ Appel accepté par ${toUserId} → room ${roomId}`);
    }
  });

  // ==========================================================
  // 🔹 Rejet d’un appel
  // ==========================================================
  socket.on("reject-call", ({ fromUserId, toUserId }) => {
    const callerSocket = users[fromUserId];
    if (callerSocket) {
      io.to(callerSocket).emit("call-rejected", { toUserId });
      console.log(`❌ Appel rejeté par ${toUserId}`);
    }
  });

  // ==========================================================
  // 🔹 Annulation de l’appel avant réponse
  // ==========================================================
  socket.on("cancel-call", ({ toUserId }) => {
    const targetSocket = users[toUserId];
    if (targetSocket) {
      io.to(targetSocket).emit("call-cancelled");
      console.log(`🚫 Appel annulé vers ${toUserId}`);
    }
  });

  // ==========================================================
  // 🔹 Gestion des rooms WebRTC (inchangée)
  // ==========================================================
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] =
      userInfo || { prenom: "Inconnu", nom: "", avatar: "default.png" };

    socket.join(roomId);
    console.log(`👤 ${userInfo?.prenom || "Utilisateur"} a rejoint la room ${roomId}`);

    socket.to(roomId).emit("user-joined", { userId: socket.id, userInfo });

    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));
    socket.emit("existing-users", existingUsers);
  });

  socket.on("leave-room", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      delete rooms[roomId][socket.id];
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", socket.id);
      console.log(`❌ ${socket.id} a quitté la room ${roomId}`);

      if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
    }
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // ==========================================================
  // 🔹 Déconnexion d’un utilisateur
  // ==========================================================
  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté:", socket.id);

    // Supprimer du registre users
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`🟥 Utilisateur ${userId} déconnecté`);
      }
    }

    // Supprimer des rooms actives
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        const userInfo = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        socket.to(roomId).emit("user-left", socket.id);
        console.log(`🚪 ${userInfo?.prenom || "Utilisateur"} a quitté la room ${roomId}`);

        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Serveur multi-room + appels directs sur http://localhost:5000");
});
