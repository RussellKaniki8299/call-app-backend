const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; // idRoom => [socketId]

io.on("connection", (socket) => {
  console.log("✅ Utilisateur connecté:", socket.id);

  socket.on("join-room", () => {
    socket.join("main");
    socket.to("main").emit("user-joined", socket.id);
  });

  socket.on("leave-room", () => {
    socket.to("main").emit("user-left", socket.id);
    socket.leave("main");
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

  socket.on("disconnect", () => {
    socket.to("main").emit("user-left", socket.id);
    console.log("❌ Utilisateur déconnecté:", socket.id);
  });
});

server.listen(5000, () => console.log("🚀 Serveur en écoute sur http://localhost:5000"));
