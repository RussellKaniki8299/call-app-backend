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

// Mapping utilisateurs
const users = {};      // { userId: socketId }
const userStates = {}; // { userId: "free" | "ringing" | "in-call" }

io.on("connection", (socket) => {
  console.log("🔌 Utilisateur connecté:", socket.id);

  // Enregistrement de l'utilisateur
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    userStates[userId] = "free";
    console.log(`👤 Utilisateur ${userId} enregistré avec socket ${socket.id}`);
    io.to(socket.id).emit("registered", { success: true, userId });
  });

  // Démarrer un appel
  socket.on("call-user", ({ from, to, type }) => {
    console.log(`📞 Tentative d'appel de ${from} vers ${to} (type: ${type})`);

    // Vérifier si l'utilisateur cible est connecté
    if (!users[to]) {
      console.log(`❌ Utilisateur ${to} non connecté`);
      io.to(users[from]).emit("call-error", { error: "user-offline", message: `L'utilisateur ${to} est hors ligne.` });
      return;
    }

    // Vérifier si l'utilisateur cible est disponible
    if (userStates[to] !== "free") {
      console.log(`⚠️ Utilisateur ${to} est occupé (état: ${userStates[to]})`);
      io.to(users[from]).emit("call-error", { error: "user-busy", message: `L'utilisateur ${to} est occupé.` });
      return;
    }

    // Mettre à jour les états
    userStates[from] = "ringing";
    userStates[to] = "ringing";

    // Envoyer l'appel entrant à la cible
    io.to(users[to]).emit("incoming-call", { from, type });
    console.log(`📱 Appel envoyé à ${to} (socket: ${users[to]})`);
  });

  // Accepter un appel
  socket.on("accept-call", ({ from, to }) => {
    console.log(`✅ Appel accepté: ${to} accepte ${from}`);

    // Mettre à jour les états
    userStates[from] = "in-call";
    userStates[to] = "in-call";

    // Notifier l'appelant
    if (users[from]) {
      io.to(users[from]).emit("call-accepted", { from: to });
      console.log(`🔔 Notification d'acceptation envoyée à ${from}`);
    }
  });

  // Refuser un appel
  socket.on("reject-call", ({ from, to }) => {
    console.log(`❌ Appel refusé: ${to} refuse ${from}`);

    // Réinitialiser les états
    userStates[from] = "free";
    userStates[to] = "free";

    // Notifier l'appelant
    if (users[from]) {
      io.to(users[from]).emit("call-rejected", { from: to });
      console.log(`🔔 Notification de refus envoyée à ${from}`);
    }
  });

  // Relayage des offres WebRTC
  socket.on("offer", ({ from, to, offer }) => {
    console.log(`📩 Offre WebRTC de ${from} vers ${to}`);
    if (users[to]) {
      io.to(users[to]).emit("offer", { from, offer });
      console.log(`📤 Offre relayée à ${to}`);
    } else {
      console.log(`❌ Utilisateur ${to} introuvable pour relayer l'offre`);
      io.to(users[from]).emit("call-error", { error: "relay-failed", message: `Impossible de relayer l'offre à ${to}.` });
    }
  });

  // Relayage des réponses WebRTC
  socket.on("answer", ({ from, to, answer }) => {
    console.log(`📤 Réponse WebRTC de ${from} vers ${to}`);
    if (users[to]) {
      io.to(users[to]).emit("answer", { from, answer });
      console.log(`📥 Réponse relayée à ${to}`);
    } else {
      console.log(`❌ Utilisateur ${to} introuvable pour relayer la réponse`);
      io.to(users[from]).emit("call-error", { error: "relay-failed", message: `Impossible de relayer la réponse à ${to}.` });
    }
  });

  // Relayage des ICE Candidates
  socket.on("ice-candidate", ({ from, to, candidate }) => {
    if (users[to]) {
      io.to(users[to]).emit("ice-candidate", { from, candidate });
      console.log(`❄️ ICE Candidate relayé de ${from} vers ${to}`);
    } else {
      console.log(`❌ Utilisateur ${to} introuvable pour relayer le ICE Candidate`);
    }
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
});
