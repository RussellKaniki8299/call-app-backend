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

// Liste des utilisateurs connectés
const users = {}; // { userId: socketId }
const userStates = {}; // { userId: "free" | "ringing" | "in-call" }

io.on("connection", (socket) => {
  console.log("✅ Un utilisateur est connecté:", socket.id);

  // Enregistrer l'utilisateur
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    userStates[userId] = "free";
    console.log(`👤 Utilisateur ${userId} enregistré avec socket ${socket.id}`);
  });

  // Démarrer un appel
  socket.on("call-user", ({ from, to, type }) => {
    const targetSocket = users[to];
    if (!targetSocket) {
      io.to(users[from]).emit("user-offline", { to });
      return;
    }

    if (userStates[to] !== "free") {
      io.to(users[from]).emit("user-busy", { to });
      return;
    }

    userStates[from] = "ringing";
    userStates[to] = "ringing";

    io.to(targetSocket).emit("incoming-call", { from, type });
  });

  // Réponse à l’appel
  socket.on("accept-call", ({ from, to, answer }) => {
    userStates[from] = "in-call";
    userStates[to] = "in-call";
    io.to(users[to]).emit("call-accepted", { from, answer });
  });

  socket.on("reject-call", ({ from, to }) => {
    userStates[from] = "free";
    userStates[to] = "free";
    io.to(users[to]).emit("call-rejected", { from });
  });

  // Signaling WebRTC
  socket.on("offer", ({ to, offer }) => {
    io.to(users[to]).emit("offer", offer);
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(users[to]).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(users[to]).emit("ice-candidate", candidate);
  });

  // Déconnexion
  socket.on("disconnect", () => {
    for (let id in users) {
      if (users[id] === socket.id) {
        console.log("❌ Utilisateur déconnecté:", id);
        delete users[id];
        delete userStates[id];
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Serveur en écoute sur http://localhost:5000");
});
