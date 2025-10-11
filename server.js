// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// --- Structure mémoire ---
// rooms = {
//   roomId1: {
//     socketId1: { prenom, nom, avatar },
//     socketId2: { prenom, nom, avatar },
//   },
// }
const rooms = {};

// --- Liste des utilisateurs connectés (pour les appels directs) ---
// connectedUsers = { userId: socketId }
const connectedUsers = {};

io.on("connection", (socket) => {
  console.log("✅ Utilisateur connecté:", socket.id);

  // --- Associer le socket.id à l'utilisateur connecté ---
  socket.on("register-user", (userId) => {
    connectedUsers[userId] = socket.id;
    console.log(`🔗 Utilisateur ${userId} enregistré avec socket ${socket.id}`);
  });

  // --- Quand un utilisateur rejoint une room ---
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] =
      userInfo || { prenom: "Inconnu", nom: "", avatar: "default.png" };

    socket.join(roomId);
    console.log(`👤 ${userInfo?.prenom || "Utilisateur"} a rejoint la room ${roomId}`);

    // Informer les autres utilisateurs de la room
    socket.to(roomId).emit("user-joined", { userId: socket.id, userInfo });

    // Envoyer la liste des participants déjà présents au nouveau
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));
    socket.emit("existing-users", existingUsers);
  });

  // --- Quand un utilisateur quitte la room ---
  socket.on("leave-room", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      delete rooms[roomId][socket.id];
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", socket.id);

      console.log(`❌ ${socket.id} a quitté la room ${roomId}`);

      if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
    }
  });

  // --- Signaling WebRTC ---
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // =====================================================
  // 🔹🔹 GESTION DES APPELS ENTRE AMIS 🔹🔹
  // =====================================================

  // --- Quand un utilisateur A appelle un ami B ---
  socket.on("call-user", ({ fromUser, toUser, callType, roomId }) => {
    const targetSocket = connectedUsers[toUser];
    if (targetSocket) {
      io.to(targetSocket).emit("incoming-call", {
        fromUser,
        callType,
        roomId,
      });
      console.log(`📞 ${fromUser.prenom} appelle ${toUser} (${callType})`);
    } else {
      socket.emit("call-error", { message: "Utilisateur non connecté" });
    }
  });

  // --- Quand un ami accepte l’appel ---
  socket.on("accept-call", ({ fromUser, toUser, roomId }) => {
    const callerSocket = connectedUsers[fromUser];
    if (callerSocket) {
      io.to(callerSocket).emit("call-accepted", { roomId });
      console.log(`✅ Appel accepté par ${toUser}`);
    }
  });

  // --- Quand un ami rejette l’appel ---
  socket.on("reject-call", ({ fromUser, toUser }) => {
    const callerSocket = connectedUsers[fromUser];
    if (callerSocket) {
      io.to(callerSocket).emit("call-rejected", { toUser });
      console.log(`❌ Appel rejeté par ${toUser}`);
    }
  });

  // --- Quand l'appelant annule avant réponse ---
  socket.on("cancel-call", ({ fromUser, toUser }) => {
    const targetSocket = connectedUsers[toUser];
    if (targetSocket) {
      io.to(targetSocket).emit("call-cancelled", { fromUser });
      console.log(`🚫 Appel annulé par ${fromUser}`);
    }
  });

  // =====================================================

  // --- Déconnexion ---
  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté:", socket.id);

    // Retirer des rooms
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        const userInfo = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        socket.to(roomId).emit("user-left", socket.id);

        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
      }
    }

    // Retirer de la liste des utilisateurs connectés
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId];
        console.log(`🔌 Utilisateur ${userId} déconnecté`);
        break;
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Serveur multi-room + appels directs sur http://localhost:5000");
});
