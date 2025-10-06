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

// Mapping des utilisateurs et des rooms
const users = {};          // { userId: socketId }
const userRooms = {};      // { userId: roomId }

io.on("connection", (socket) => {
  console.log(`✅ Nouvelle connexion: ${socket.id}`);

  // Enregistrement de l'utilisateur
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log(`👤 Utilisateur enregistré: ${userId} (socket: ${socket.id})`);
    socket.emit("registered", { success: true, userId });
  });

  // Rejoindre une room pour un appel 1:1
  socket.on("join-call", (roomId) => {
    socket.join(roomId);
    userRooms[socket.id] = roomId;
    console.log(`👥 ${socket.id} a rejoint la room ${roomId}`);
  });

  // Démarrer un appel (notification)
  socket.on("call-user", ({ from, to, type }) => {
    console.log(`📞 Appel de ${from} vers ${to} (type: ${type})`);
    if (!users[to]) {
      console.log(`❌ Utilisateur ${to} non connecté`);
      io.to(users[from]).emit("call-error", {
        error: "user-offline",
        message: `L'utilisateur ${to} est hors ligne.`,
      });
      return;
    }
    // Notifier l'utilisateur appelé
    io.to(users[to]).emit("incoming-call", { from, type });
    console.log(`🔔 Notification d'appel envoyée à ${to}`);
  });

  // Relayage des offres WebRTC
  socket.on("offer", ({ from, to, offer }) => {
    console.log(`📤 Offre de ${from} vers ${to}`);
    if (!users[to]) {
      console.log(`❌ Utilisateur ${to} introuvable`);
      io.to(users[from]).emit("call-error", {
        error: "user-offline",
        message: `L'utilisateur ${to} est hors ligne.`,
      });
      return;
    }
    // Envoyer l'offre à la room dédiée (si utilisée) ou directement à l'utilisateur
    const roomId = `call-${Math.min(from, to)}-${Math.max(from, to)}`;
    socket.to(roomId).emit("offer", { from, offer });
    console.log(`✅ Offre relayée à ${to} dans la room ${roomId}`);
  });

  // Relayage des réponses WebRTC
  socket.on("answer", ({ from, to, answer }) => {
    console.log(`📥 Réponse de ${from} vers ${to}`);
    if (!users[to]) {
      console.log(`❌ Utilisateur ${to} introuvable`);
      return;
    }
    const roomId = `call-${Math.min(from, to)}-${Math.max(from, to)}`;
    socket.to(roomId).emit("answer", { from, answer });
    console.log(`✅ Réponse relayée à ${to} dans la room ${roomId}`);
  });

  // Relayage des ICE Candidates
  socket.on("ice-candidate", ({ from, to, candidate }) => {
    console.log(`❄️ ICE Candidate de ${from} vers ${to}`);
    if (!users[to]) {
      console.log(`❌ Utilisateur ${to} introuvable`);
      return;
    }
    const roomId = `call-${Math.min(from, to)}-${Math.max(from, to)}`;
    socket.to(roomId).emit("ice-candidate", { from, candidate });
    console.log(`✅ ICE Candidate relayé à ${to} dans la room ${roomId}`);
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log(`❌ Déconnexion: ${socket.id}`);
    // Retirer l'utilisateur des mappings
    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        delete userRooms[socket.id];
        console.log(`🗑️ Utilisateur ${userId} retiré`);
        break;
      }
    }
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Socket.IO en écoute sur le port ${PORT}`);
});
