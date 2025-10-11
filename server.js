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

// Rooms en mémoire
const rooms = {}; // { roomId: [socketId1, socketId2, ...] }

io.on("connection", (socket) => {
  console.log("✅ Utilisateur connecté:", socket.id);

  // Rejoindre une room
  socket.on("join-room", ({ roomId }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    socket.join(roomId);
    console.log(`Utilisateur ${socket.id} a rejoint la room ${roomId}`);

    // Informer les autres participants
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // Quitter une room
  socket.on("leave-room", ({ roomId }) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });

  // Signaling WebRTC
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté:", socket.id);
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Serveur multi-room en écoute sur http://localhost:5000");
});
