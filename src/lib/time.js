const pad = (n) => String(n).padStart(2, '0');

/** HH:mm (24h, heure locale serveur) — format attendu par les clients de chat */
const hhmm = (date = new Date()) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** YYYY-MM-DD HH:mm:ss en heure locale (sans décalage UTC) */
const localDateTime = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

module.exports = { hhmm, localDateTime };
