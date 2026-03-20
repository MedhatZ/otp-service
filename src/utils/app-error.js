class AppError extends Error {
  constructor(message, statusCode = 500, details = null, headers = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.headers = headers;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
