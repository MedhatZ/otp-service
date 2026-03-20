const AppError = require('../utils/app-error');
const asyncHandler = require('./async-handler.middleware');
const { verifyToken } = require('../services/auth.service');
const { findUserById } = require('../services/user.service');

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');
  const scheme = parts[0];
  const token = parts[1];

  if (!authHeader || scheme !== 'Bearer' || !token || parts.length !== 2) {
    throw new AppError('Invalid or missing authorization token', 401);
  }

  const payload = await verifyToken(token);
  const user = await findUserById(payload.userId);

  if (!user) {
    throw new AppError('User not found for provided token.', 401);
  }

  req.user = user;
  next();
});

module.exports = authMiddleware;
