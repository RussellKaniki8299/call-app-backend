const logger = require('../../lib/logger')('HTTP');

// eslint-disable-next-line no-unused-vars
module.exports = (err, _req, res, _next) => {
  logger.error(err.message);
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || 500;
  res.status(status).json({ success: false, message: err.message });
};
