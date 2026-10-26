const crypto = require('crypto');
const { notifyKey } = require('../../config/env');

const safeEqual = (a = '', b = '') => {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

/** Protège une route par la clé partagée (query `?key=` ou en-tête `x-notify-key`) */
module.exports = (enabled = true) => (req, res, next) => {
  if (!enabled) return next();
  const provided = req.query.key || req.get('x-notify-key');
  if (!safeEqual(provided, notifyKey)) return res.status(403).json({ error: 'Forbidden' });
  next();
};
