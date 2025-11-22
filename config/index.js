require('dotenv').config();

module.exports = {
  SECRET_KEY: process.env.NODE_NOTIFY_KEY || "rud@@##less",
  PORT: process.env.PORT || 5000,
};
