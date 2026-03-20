const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  const response = {
    success: false,
    message,
  };

  if (err.details) {
    response.data = err.details;
  }

  if (process.env.NODE_ENV !== 'production' && !response.data) {
    response.data = {
      stack: err.stack,
    };
  }

  if (err.headers && typeof err.headers === 'object') {
    Object.entries(err.headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });
  }

  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled server error');
  } else {
    logger.warn(
      { message, path: req.originalUrl, method: req.method, statusCode },
      'Request failed'
    );
  }

  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
