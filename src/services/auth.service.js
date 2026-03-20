const jwt = require('jsonwebtoken');
const AppError = require('../utils/app-error');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is missing. Refusing to start without JWT signing secret.');
}

const generateToken = async (user) => {
  const payload = {
    userId: user.id,
    phoneNumber: user.phoneNumber,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = async (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired token.', 401);
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
