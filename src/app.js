const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const otpRoutes = require('./routes/otp.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const {
  notFoundHandler,
  errorHandler,
} = require('./middlewares/error.middleware');
const logger = require('./config/logger');
const { globalRateLimit } = require('./middlewares/global-rate-limit.middleware');

const app = express();

app.set('trust proxy', true);
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    customSuccessMessage: () => 'Request completed',
    customErrorMessage: () => 'Request errored',
  })
);
app.use(globalRateLimit);

app.use('/api/otp', otpRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;