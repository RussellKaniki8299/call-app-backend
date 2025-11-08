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
} = require("./handlers/utils");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());
app.use(morgan("dev"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Mémoire en RAM
const users = {}; // userId -> socketId
const rooms = {}; // roomId -> { socketId: userInfo }

app.get("/", (req, res) => {
  res.send("Backend Socket.IO en ligne !");
});

io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  // Quand le front envoie son user_id après connexion
  socket.on("register-user", async (userId) => {
    console.log(`User enregistré : ${userId}`);

    // Enregistre la correspondance userId -> socket.id
    users[userId] = socket.id;

    // Appel API Laravel pour mettre en ligne
    try {
      await axios.post("https://api.rudless.com/api/surho/update/en-ligne", {
        user_id: userId,
      });
      console.log(`User ${userId} marqué en ligne`);
    } catch (error) {
      console.error(`Erreur mise en ligne user ${userId}:`, error.message);
    }

    // Diffuse l'événement de présence
    io.emit("user-online", { user_id: userId });
  });

  // Déconnexion
  socket.on("disconnect", async () => {
    console.log(`Déconnexion : ${socket.id}`);

    let disconnectedUserId = null;

    // Retrouve l'utilisateur associé à ce socket
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

    // Met à jour l'état hors ligne
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

  // Handlers existants
  registerCallHandlers(io, socket, users);
  registerRoomHandlers(io, socket, rooms, users);
  registerChatHandlers(io, socket, users);
  registerNotificationHandlers(io, socket, users);
});

server.listen(5000, () => {
  console.log("Serveur Socket.IO prêt sur http://localhost:5000");
});
