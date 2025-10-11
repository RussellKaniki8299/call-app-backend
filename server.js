// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// Création du serveur HTTP + Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- Mémoire temporaire pour les rooms WebRTC ---
// Structure :
// rooms = {
//   roomId1: {
//     socketId1: { prenom, nom, avatar },
//     socketId2: { prenom, nom, avatar },
//   },
// }
const rooms = {};

// --- Liste des utilisateurs connectés ---
// connectedUsers = { userId: socketId }
const connectedUsers = {};

io.on("connection", (socket) => {
  console.log("✅ Utilisateur connecté :", socket.id);

  // =====================================================
  // 🟢 ENREGISTREMENT D'UN UTILISATEUR CONNECTÉ
  // =====================================================
  socket.on("register-user", (userId) => {
    if (userId) {
      connectedUsers[userId] = socket.id;
      console.log(`🔗 Utilisateur ${userId} enregistré avec socket ${socket.id}`);
    }
  });

  // =====================================================
  // 🟢 JOIN ROOM (appel groupé ou lien direct)
  // =====================================================
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!roomId) return;

    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] =
      userInfo || { prenom: "Inconnu", nom: "", avatar: "default.png" };

    socket.join(roomId);
    console.log(`👤 ${userInfo?.prenom || "Utilisateur"} a rejoint la room ${roomId}`);

    // Informer les autres utilisateurs
    socket.to(roomId).emit("user-joined", { userId: socket.id, userInfo });

    // Envoyer la liste des utilisateurs déjà présents à celui qui rejoint
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));
    socket.emit("existing-users", existingUsers);
  });

  // =====================================================
  // 🟢 LEAVE ROOM
  // =====================================================
  socket.on("leave-room", ({ roomId }) => {
    if (!roomId || !rooms[roomId] || !rooms[roomId][socket.id]) return;

    delete rooms[roomId][socket.id];
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", socket.id);

    console.log(`❌ ${socket.id} a quitté la room ${roomId}`);

    // Supprimer la room si elle est vide
    if (Object.keys(rooms[roomId]).length === 0) {
      delete rooms[roomId];
    }
  });

  // =====================================================
  // 🟢 SIGNALING WEBRTC
  // =====================================================
  socket.on("offer", ({ offer, to }) => {
    if (to && offer) io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    if (to && answer) io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    if (to && candidate)
      io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // =====================================================
  // 🔹🔹 GESTION DES APPELS ENTRE AMIS 🔹🔹
  // =====================================================

  // 🟢 L'appelant initie l'appel
  socket.on("call-user", ({ fromUser, toUser, callType, roomId }) => {
    if (!fromUser || !toUser || !roomId) return;

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

  // 🟢 L'ami accepte l'appel
  socket.on("accept-call", ({ fromUserId, toUserId, roomId }) => {
    const callerSocket = connectedUsers[fromUserId];
    if (callerSocket) {
      io.to(callerSocket).emit("call-accepted", { roomId });
      console.log(`✅ Appel accepté par ${toUserId}`);
    }
  });

  // 🟢 L'ami rejette l'appel
  socket.on("reject-call", ({ fromUserId, toUserId }) => {
    const callerSocket = connectedUsers[fromUserId];
    if (callerSocket) {
      io.to(callerSocket).emit("call-rejected", { toUserId });
      console.log(`❌ Appel rejeté par ${toUserId}`);
    }
  });

  // 🟢 L'appelant annule avant réponse
  socket.on("cancel-call", ({ fromUserId, toUserId }) => {
    const targetSocket = connectedUsers[toUserId];
    if (targetSocket) {
      io.to(targetSocket).emit("call-cancelled", { fromUserId });
      console.log(`🚫 Appel annulé par ${fromUserId}`);
    }
  });

  // =====================================================
  // 🟢 DÉCONNEXION
  // =====================================================
  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté :", socket.id);

    // Retirer des rooms
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        const userInfo = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        socket.to(roomId).emit("user-left", socket.id);
        console.log(`🚪 ${userInfo?.prenom || "Utilisateur"} a quitté la room ${roomId}`);

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

// =====================================================
// 🟢 LANCEMENT DU SERVEUR
// =====================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Socket.io en écoute sur http://localhost:${PORT}`);
});
