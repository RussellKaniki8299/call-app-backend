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

// --- Structure mémoire pour les appels classiques ---
// rooms = {
//   roomId1: {
//     socketId1: { prenom, nom, avatar },
//     socketId2: { prenom, nom, avatar },
//   },
// }
const rooms = {};

io.on("connection", (socket) => {
  console.log("✅ Utilisateur connecté:", socket.id);

  // --- Appels (audio/vidéo) ---
  socket.on("join-room", ({ roomId, userInfo }) => {
    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = userInfo || { prenom: "Inconnu", nom: "", avatar: "default.png" };

    socket.join(roomId);
    console.log(`👤 ${userInfo?.prenom || "Utilisateur"} a rejoint la room ${roomId}`);

    socket.to(roomId).emit("user-joined", { userId: socket.id, userInfo });

    const existingUsers = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ userId: id, userInfo: info }));
    socket.emit("existing-users", existingUsers);
  });

  socket.on("leave-room", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      delete rooms[roomId][socket.id];
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", socket.id);
      console.log(`❌ ${socket.id} a quitté la room ${roomId}`);
      if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
    }
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // --- Gestion des lives ---
  const liveRooms = {}; // { liveId: { host: socketId, viewers: [] } }

  socket.on("join-live", ({ liveId, role }) => {
    if (!liveRooms[liveId]) liveRooms[liveId] = { host: null, viewers: [] };

    if (role === "host") {
      liveRooms[liveId].host = socket.id;
      socket.join(liveId);
      console.log(`🎥 Hôte connecté au live ${liveId}`);
    } else {
      liveRooms[liveId].viewers.push(socket.id);
      socket.join(liveId);
      console.log(`👀 Spectateur rejoint le live ${liveId}`);

      const hostId = liveRooms[liveId]?.host;
      if (hostId) io.to(hostId).emit("viewer-joined", { socketId: socket.id });
    }
  });

  socket.on("offer-live", ({ offer, to }) => {
    io.to(to).emit("offer-live", { offer, from: socket.id });
  });

  socket.on("answer-live", ({ answer, to }) => {
    io.to(to).emit("answer-live", { answer, from: socket.id });
  });

  socket.on("ice-candidate-live", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate-live", { candidate, from: socket.id });
  });

  socket.on("leave-live", ({ liveId }) => {
    if (liveRooms[liveId]) {
      if (liveRooms[liveId].host === socket.id) {
        io.to(liveId).emit("live-ended");
        delete liveRooms[liveId];
      } else {
        liveRooms[liveId].viewers = liveRooms[liveId].viewers.filter(
          (id) => id !== socket.id
        );
        io.to(liveRooms[liveId].host).emit("viewer-left", { socketId: socket.id });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté:", socket.id);

    // 🔹 Gestion des rooms d'appel
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        const userInfo = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        socket.to(roomId).emit("user-left", socket.id);
        console.log(`🚪 ${userInfo?.prenom || "Utilisateur"} a quitté la room ${roomId}`);
        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
      }
    }

    // 🔹 Gestion des lives
    for (const liveId in liveRooms) {
      const live = liveRooms[liveId];
      if (live.host === socket.id) {
        io.to(liveId).emit("live-ended");
        delete liveRooms[liveId];
      } else if (live.viewers.includes(socket.id)) {
        live.viewers = live.viewers.filter((id) => id !== socket.id);
        io.to(live.host).emit("viewer-left", { socketId: socket.id });
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Serveur multi-room + live en écoute sur http://localhost:5000");
});
