/** Transmet les erreurs async à errorHandler */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
