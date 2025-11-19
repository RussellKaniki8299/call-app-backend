const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");

const {
  registerCallHandlers,
  registerRoomHandlers,
  registerChatHandlers,
  registerNotificationHandlers,
  registerFriendsHandlers,
} = require("./handlers/utils");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());
app.use(morgan("dev"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Stockage en mémoire
const users = {}; // userId -> socketId
const rooms = {}; // roomId -> { socketId: userInfo }

const SECRET_KEY = process.env.NODE_NOTIFY_KEY || "rud@@##less";

// Test simple
app.get("/", (req, res) => {
  res.send("Backend Socket.IO en ligne !");
});

// Endpoint pour recevoir les notifications depuis Laravel
app.post("/notify", (req, res) => {
  const key = req.query.key;
  if (key !== SECRET_KEY) return res.status(403).json({ error: "Forbidden" });

  const { toUserId, type, payload } = req.body;
  if (!toUserId) return res.status(400).json({ error: "toUserId manquant" });

  const socketId = users[toUserId];
  if (socketId) {
    io.to(socketId).emit("new-notification", { type, payload });
    console.log(`[Notification] Envoyée à user ${toUserId} | type: ${type}`);
  } else {
    console.log(`[Notification] User ${toUserId} non connecté`);
  }

  return res.json({ status: "ok" });
});

// WebSocket
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  socket.on("register-user", async (userId) => {
    console.log(`User enregistré : ${userId}`);
    users[userId] = socket.id;

    // Appel API Laravel pour marquer en ligne
    try {
      await axios.post("https://api.rudless.com/api/surho/update/en-ligne", {
        user_id: userId,
      });
      console.log(`User ${userId} marqué en ligne`);
    } catch (error) {
      console.error(`Erreur mise en ligne user ${userId}:`, error.message);
    }

    io.emit("user-online", { user_id: userId });
  });

  socket.on("disconnect", async () => {
    console.log(`Déconnexion : ${socket.id}`);
    let disconnectedUserId = null;

    // Retrouver l’utilisateur
    for (const userId in users) {
      if (users[userId] === socket.id) {
        disconnectedUserId = userId;
        delete users[userId];
        console.log(`Utilisateur ${userId} supprimé du registre`);
        break;
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

    // Appel API Laravel pour marquer hors ligne
    if (disconnectedUserId) {
      try {
        await axios.post("https://api.rudless.com/api/surho/update/hors-ligne", {
          user_id: disconnectedUserId,
        });
        console.log(`User ${disconnectedUserId} marqué hors ligne`);
      } catch (error) {
        console.error(`Erreur mise hors ligne user ${disconnectedUserId}:`, error.message);
      }

      io.emit("user-offline", { user_id: disconnectedUserId });
    }
  });

  // Handlers
  registerCallHandlers(io, socket, users);
  registerRoomHandlers(io, socket, rooms, users);
  registerChatHandlers(io, socket, users);
  registerNotificationHandlers(io, socket, users);
  registerFriendsHandlers(io, socket, users);
});

// Render expose souvent le port via process.env.PORT
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO prêt sur http://localhost:${PORT}`);
});
