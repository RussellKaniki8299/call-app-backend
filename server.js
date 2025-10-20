// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");

const {
  registerCallHandlers,
  registerRoomHandlers,
  registerChatHandlers,
  registerNotificationHandlers,
} = require("./handlers/utils");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] })); // à restreindre en prod
app.use(express.json());
app.use(morgan("dev")); // logs HTTP

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Mémoire en RAM
const users = {}; // userId -> socketId
const rooms = {}; // roomId -> { socketId: userInfo }

io.on("connection", (socket) => {
  console.log(`✅ Utilisateur connecté : ${socket.id}`);

  // --- Handlers modulaires ---
  registerCallHandlers(io, socket, users);
  registerRoomHandlers(io, socket, rooms, users);
  registerChatHandlers(io, socket, users);
  registerNotificationHandlers(io, socket, users);

  // --- Déconnexion ---
  socket.on("disconnect", () => {
    console.log(`❌ Déconnexion : ${socket.id}`);
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`🟥 Utilisateur ${userId} supprimé du registre`);
      }
    }

    // Nettoyage des rooms
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        delete rooms[roomId][socket.id];
        socket.to(roomId).emit("user-left", socket.id);
        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Serveur Socket.IO prêt sur http://localhost:5000");
});
