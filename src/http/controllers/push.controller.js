const { sendExpoPush } = require('../../services/push.service');
const logger = require('../../lib/logger')('Push');

exports.sendPush = async (req, res) => {
  const { token, tokens, title, body, avatar, data, categoryId } = req.body || {};

  const list = Array.isArray(tokens) && tokens.length ? tokens : token ? [token] : [];
  if (!list.length || !title || !body) {
    return res.status(400).json({ error: 'token ou tokens[], title et body obligatoires' });
  }

  try {
    const { sent, invalidTokens } = await sendExpoPush({ tokens: list, title, body, avatar, data, categoryId });
    // `invalidTokens` : à supprimer côté Laravel si besoin
    return res.json({ status: 'ok', sent, invalidTokens });
  } catch (error) {
    logger.error('Envoi push échoué', { error: error.response?.data || error.message });
    return res.status(500).json({ error: error.message });
  }
};
