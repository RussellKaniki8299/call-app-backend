const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { corsOrigin, uploadDir, isProd } = require('./config/env');
const routes = require('./http/routes');
const errorHandler = require('./http/middlewares/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

app.use('/uploads', express.static(path.resolve(uploadDir)));
app.use(routes);
app.use(errorHandler);

module.exports = app;
