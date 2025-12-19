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


app.use("/uploads", express.static("uploads"));
app.use("/api/chat", require("./routes/chatUpload"));


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
      console.log(`User ${userId} marqué en ligne`);
    } catch (error) {
      console.error(`Erreur mise en ligne user ${userId}:`, error.message);
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
        console.log(`Utilisateur ${userId} supprimé`);
        break;
      }
    }

    // Retirer des rooms
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        delete rooms[roomId][socket.id];

        socket.to(roomId).emit("user-left", socket.id);

        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
      }
    }

    
    // Marquer hors ligne
    if (disconnectedUserId) {
      try {
        await axios.post(
          "https://api.rudless.com/api/surho/update/hors-ligne",
          { user_id: disconnectedUserId }
        );
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
  registerCommentHandlers(io, socket, users);
  registerNotificationHandlers(io, socket, users);
  registerFriendsRequestHandlers(io, socket, users);
  registerUnreadMessagesHandlers(io, socket, users);
});

// Lancement
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO prêt sur le port ${PORT}`);
});
