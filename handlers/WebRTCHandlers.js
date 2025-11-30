// handlers/webRTCHandlers.js
module.exports = function registerWebRTCHandlers(io, socket) {
  const pcs = {};

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("leave-session", ({ sessionId }) => {
    if (pcs[sessionId]) {
      pcs[sessionId].close();
      delete pcs[sessionId];
    }
  });

  socket.createPeerConnection = (socketId, localStream) => {
    if (pcs[socketId]) return pcs[socketId];

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcs[socketId] = pc;

    localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      socket.emit("remote-stream", { from: socketId, stream: event.streams[0] });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit("ice-candidate", { candidate: event.candidate, to: socketId });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        pc.close();
        delete pcs[socketId];
      }
    };

    return pc;
  };
};
