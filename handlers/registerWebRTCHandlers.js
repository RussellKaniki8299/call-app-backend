module.exports = function registerWebRTCHandlers(io, socket) {
  // Dictionnaire pour stocker les PeerConnections par socketId
  const pcs = {};

  // Offre envoyée à un utilisateur
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  // Réponse à une offer
  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  // ICE candidate
  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // Nettoyage automatique si un utilisateur quitte
  socket.on("leave-session", ({ sessionId }) => {
    if (pcs[sessionId]) {
      pcs[sessionId].close();
      delete pcs[sessionId];
    }
  });

  // Création sécurisée d'une PeerConnection
  socket.createPeerConnection = (socketId, localStream) => {
    if (pcs[socketId]) return pcs[socketId];

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcs[socketId] = pc;

    // Tracks locales
    localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Tracks distants
    pc.ontrack = (event) => {
      socket.emit("remote-stream", { from: socketId, stream: event.streams[0] });
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit("ice-candidate", { candidate: event.candidate, to: socketId });
    };

    // Nettoyage automatique
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        pc.close();
        delete pcs[socketId];
      }
    };

    return pc;
  };
};
