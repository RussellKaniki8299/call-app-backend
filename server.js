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

io.on("connection", (socket) => {
  console.log("✅ Utilisateur connecté:", socket.id);

  // --- Quand un utilisateur rejoint une room ---
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = userInfo || { prenom: "Inconnu", nom: "", avatar: "default.png" };

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

  // --- Quand un utilisateur quitte la room manuellement ---
  socket.on("leave-room", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      delete rooms[roomId][socket.id];
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", socket.id);

      console.log(`❌ ${socket.id} a quitté la room ${roomId}`);

      // Supprimer la room si vide
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

  // --- Déconnexion ---
  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté:", socket.id);

    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        const userInfo = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        socket.to(roomId).emit("user-left", socket.id);

        console.log(`🚪 ${userInfo?.prenom || "Utilisateur"} a quitté la room ${roomId}`);

        // Supprimer la room si vide
        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Serveur multi-room en écoute sur http://localhost:5000");
});
