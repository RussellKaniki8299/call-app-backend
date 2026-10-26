const axios = require('axios');
const { expoPushUrl } = require('../config/env');
const logger = require('../lib/logger')('Push');

const CHUNK_SIZE = 100; // limite Expo : 100 messages par requête

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/**
 * Envoie une notification Expo à un ou plusieurs tokens.
 * @returns {{sent:number, invalidTokens:string[]}}
 */
async function sendExpoPush({ tokens, title, body, avatar, data, categoryId }) {
  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    channelId: 'default',
    mutableContent: true,
    data: data || {},
    ...(categoryId ? { categoryId } : {}),
    ...(avatar ? { richContent: { image: avatar } } : {}),
  }));

  const invalidTokens = [];
  for (const batch of chunk(messages, CHUNK_SIZE)) {
    const { data: res } = await axios.post(expoPushUrl, batch, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    (res?.data || []).forEach((ticket, i) => {
      if (ticket.status === 'error') {
        invalidTokens.push(batch[i].to);
        logger.warn('Token invalide', { token: batch[i].to, details: ticket.details });
      }
    });
  }
  return { sent: messages.length, invalidTokens };
}

module.exports = { sendExpoPush };
