const crypto = require('crypto');

const newId = () => crypto.randomUUID();

/** Noms de rooms Socket.IO préfixés : évite la collision user 12 ≠ post 12 */
const userRoom = (userId) => `user:${userId}`;
const postRoom = (postId) => `post:${postId}`;

module.exports = { newId, userRoom, postRoom };
