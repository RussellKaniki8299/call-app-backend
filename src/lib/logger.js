const { isProd } = require('../config/env');

const stamp = () => new Date().toISOString();
const fmt = (level, scope, msg, extra) =>
  `${stamp()} [${level}]${scope ? ` [${scope}]` : ''} ${msg}${extra !== undefined ? ' ' + JSON.stringify(extra) : ''}`;

/** Logger minimaliste avec portée : const log = logger('Chat'); log.info('...') */
module.exports = (scope = '') => ({
  info: (msg, extra) => console.log(fmt('INFO', scope, msg, extra)),
  warn: (msg, extra) => console.warn(fmt('WARN', scope, msg, extra)),
  error: (msg, extra) => console.error(fmt('ERROR', scope, msg, extra)),
  debug: (msg, extra) => { if (!isProd) console.log(fmt('DEBUG', scope, msg, extra)); },
});
