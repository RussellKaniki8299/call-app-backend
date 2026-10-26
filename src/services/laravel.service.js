const axios = require('axios');
const { laravelApiUrl } = require('../config/env');
const logger = require('../lib/logger')('Laravel');

const client = axios.create({ baseURL: laravelApiUrl, timeout: 8000 });

async function post(path, body) {
  try {
    await client.post(path, body);
    return true;
  } catch (err) {
    logger.warn(`POST ${path} a échoué`, { message: err.message });
    return false;
  }
}

const setUserOnline = (userId) => post('/surho/update/en-ligne', { user_id: userId });
const setUserOffline = (userId) => post('/surho/update/hors-ligne', { user_id: userId });

module.exports = { setUserOnline, setUserOffline };
