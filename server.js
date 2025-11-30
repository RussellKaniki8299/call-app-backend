const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");
const { SECRET_KEY, PORT } = require("./config");

// Handlers
const {
  registerCallHandlers,
  registerRoomHandlers,
  registerChatHandlers,
  registerNotificationHandlers,
  registerFriendsRequestHandlers,
  registerUnreadMessagesHandlers,
  registerCommentHandlers,
} = require("./handlers/utils");

// Controllers
const { handleCountNotification } = require("./controllers/notificationController");
const { handleCountFriendRequest } = require("./controllers/friendRequestController");
const { handleCountMessage } = require("./controllers/messageController");

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

// Route test
app.get("/", (req, res) => {
  res.send("Backend Socket.IO en ligne !");
});

// Routes comptages
app.post("/count-notification", handleCountNotification(io, users));
app.post("/count-friend-request", handleCountFriendRequest(io, users));
app.post("/count-message", handleCountMessage(io, users));

// WebRTC handler global
function registerWebRTCHandlers(io, socket) {
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });
}

// WebSocket
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  // Enregistrement user
  socket.on("register-user", async (userId) => {
    console.log(`User enregistré : ${userId}`);
    users[userId] = socket.id;

    try {
      await axios.post("https://api.rudless.com/api/surho/update/en-ligne", {
        user_id: userId,
      });
    } catch (error) {
      console.error("Erreur mise en ligne :", error.message);
    }

    io.emit("user-online", { user_id: userId });
  });

  // Déconnexion
  socket.on("disconnect", async () => {
    console.log(`Déconnexion : ${socket.id}`);
    let disconnectedUserId = null;

    // Retirer des users
    for (const userId in users) {
      if (users[userId] === socket.id) {
        disconnectedUserId = userId;
        delete users[userId];
        break;
      }
    }

    // Retirer des rooms
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        delete rooms[roomId][socket.id];

        socket.to(roomId).emit("user-left", socket.id);

        if (Object.keys(rooms[roomId]).length === 0) {
          delete rooms[roomId];
        }
      }
    }

    // Marquer hors ligne
    if (disconnectedUserId) {
      try {
        await axios.post("https://api.rudless.com/api/surho/update/hors-ligne", {
          user_id: disconnectedUserId,
        });
      } catch (error) {
        console.error("Erreur mise hors ligne :", error.message);
      }

      io.emit("user-offline", { user_id: disconnectedUserId });
    }
  });

  // Handlers
  registerRoomHandlers(io, socket, rooms, users);
  registerChatHandlers(io, socket, users);
  registerCommentHandlers(io, socket, users);
  registerNotificationHandlers(io, socket, users);
  registerFriendsRequestHandlers(io, socket, users);
  registerUnreadMessagesHandlers(io, socket, users);
  registerCallHandlers(io, socket, users);

  // WebRTC (global)
  registerWebRTCHandlers(io, socket);
});

// Lancement
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO prêt sur http://localhost:${PORT}`);
});
