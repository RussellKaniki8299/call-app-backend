const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");
const { SECRET_KEY, PORT } = require("./config");

const {
  registerCallHandlers,
  registerRoomHandlers,
  registerChatHandlers,
  registerNotificationHandlers,
  registerFriendsRequestHandlers,
  registerUnreadMessagesHandlers,
  registerCommentHandlers,
  registerWebRTCHandlers,
} = require("./handlers/utils");

// Controllers
const { handleCountNotification } = require('./controllers/notificationController');
const { handleCountFriendRequest } = require('./controllers/friendRequestController');
const { handleCountMessage } = require('./controllers/messageController');

// Initialisation
const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());
app.use(morgan("dev"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Stockage mémoire
const users = {}; // userId -> socketId
const rooms = {}; // roomId -> { socketId: userInfo }
const liveRooms = {}; // liveId -> { socketId: userInfo }

// Route test
app.get("/", (req, res) => {
  res.send("Backend Socket.IO en ligne !");
});

// Routes comptages
app.post("/count-notification", handleCountNotification(io, users));
app.post("/count-friend-request", handleCountFriendRequest(io, users));
app.post("/count-message", handleCountMessage(io, users));

// WebSocket
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  // Enregistrement user
  socket.on("register-user", async (userId) => {
    users[userId] = socket.id;
    io.emit("user-online", { user_id: userId });
  });

  // Déconnexion
  socket.on("disconnect", () => {
    // Retirer des users, rooms, lives
    for (const userId in users) {
      if (users[userId] === socket.id) delete users[userId];
    }

    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        delete rooms[roomId][socket.id];
        socket.to(roomId).emit("user-left", socket.id);
        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
      }
    }

    for (const liveId in liveRooms) {
      if (liveRooms[liveId][socket.id]) {
        delete liveRooms[liveId][socket.id];
        socket.to(liveId).emit("live-user-left", { userId: socket.id });
        if (Object.keys(liveRooms[liveId]).length === 0) delete liveRooms[liveId];
      }
    }

    io.emit("user-offline", { user_id: socket.id });
  });

  // Handlers
  registerCallHandlers(io, socket, users);
  registerRoomHandlers(io, socket, rooms, users);
  registerChatHandlers(io, socket, users);
  registerCommentHandlers(io, socket, users);
  registerNotificationHandlers(io, socket, users);
  registerFriendsRequestHandlers(io, socket, users);
  registerUnreadMessagesHandlers(io, socket, users);

  registerWebRTCHandlers(io, socket);
});


// Lancement
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO prêt sur http://localhost:${PORT}`);
});
