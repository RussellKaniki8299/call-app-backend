const { SECRET_KEY } = require('../config');

const handleCountFriendRequest = (io, users) => (req, res) => {
  const key = req.query.key;
  if (key !== SECRET_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { toUserId, count } = req.body;
  if (!toUserId) {
    return res.status(400).json({ error: "toUserId manquant" });
  }
  console.log(`[Count-Friend-Request] Reçue pour user ${toUserId} | count: ${count}`);
  const socketId = users[toUserId];
  if (socketId) {
    io.to(socketId).emit("new-friend-request-count", { count });
    console.log(`[Count-Friend-Request] Envoyée à user ${toUserId} | count: ${count}`);
  } else {
    console.log(`[Count-Friend-Request] user ${toUserId} non connecté`);
  }
  return res.json({ status: "ok" });
};

module.exports = { handleCountFriendRequest };
