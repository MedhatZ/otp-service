const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.body.code', 'authToken'],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
