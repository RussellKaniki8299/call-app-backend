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

const users = {};       // { userId: socketId }
const userStates = {};  // { userId: "free" | "ringing" | "in-call" }

io.on("connection", (socket) => {
  console.log("🔌 Nouvelle connexion:", socket.id);

  // Enregistrer un utilisateur
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    userStates[userId] = "free";
    console.log(`✅ Utilisateur ${userId} enregistré avec socket ${socket.id}`);
  });

  // Démarrer un appel
  socket.on("call-user", ({ from, to, type }) => {
    console.log(`📞 ${from} appelle ${to} (${type})`);
    const targetSocket = users[to];

    if (!targetSocket) {
      console.log(`⚠️ Utilisateur ${to} hors ligne`);
      io.to(users[from]).emit("user-offline", { to });
      return;
    }

    if (userStates[to] !== "free") {
      console.log(`🚫 Utilisateur ${to} occupé`);
      io.to(users[from]).emit("user-busy", { to });
      return;
    }

    userStates[from] = "ringing";
    userStates[to] = "ringing";

    console.log(`📲 Envoi de "incoming-call" à ${to}`);
    io.to(targetSocket).emit("incoming-call", { from, type });
  });

  // Accepter un appel
  socket.on("accept-call", ({ from, to }) => {
    // from = appelant, to = receveur
    console.log(`✅ Appel accepté par ${to} (appelant: ${from})`);

    userStates[from] = "in-call";
    userStates[to] = "in-call";

    // Envoie la confirmation à l'appelant
    if (users[from]) {
      io.to(users[from]).emit("call-accepted", { from: to });
    }
  });

  // Refuser un appel
  socket.on("reject-call", ({ from, to }) => {
    console.log(`❌ Appel rejeté par ${to}`);
    userStates[from] = "free";
    userStates[to] = "free";
    if (users[from]) io.to(users[from]).emit("call-rejected", { from: to });
  });

  // WebRTC - Signalisation
  socket.on("offer", ({ from, to, offer }) => {
    console.log(`📤 Offre envoyée de ${from} → ${to}`);
    if (users[to]) io.to(users[to]).emit("offer", { from, offer });
  });

  socket.on("answer", ({ from, to, answer }) => {
    console.log(`📥 Réponse envoyée de ${from} → ${to}`);
    if (users[to]) io.to(users[to]).emit("answer", { from, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    if (users[to]) io.to(users[to]).emit("ice-candidate", candidate);
  });

  // Déconnexion
  socket.on("disconnect", () => {
    for (const id in users) {
      if (users[id] === socket.id) {
        console.log(`🔴 Utilisateur ${id} déconnecté`);
        delete users[id];
        delete userStates[id];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur WebRTC en écoute sur le port ${PORT}`);
});
