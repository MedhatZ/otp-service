const asyncHandler = require('./async-handler.middleware');
const { enforceRateLimit } = require('../services/rate-limit.service');
const logger = require('../config/logger');

const GLOBAL_RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS || 100
);
const GLOBAL_RATE_LIMIT_WINDOW_MS = Number(
  process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000
);

const getClientIp = (req) =>
  req.ip ||
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  'unknown';

const globalRateLimit = asyncHandler(async (req, res, next) => {
  const ip = getClientIp(req);
  await enforceRateLimit({
    key: `otp:global:${ip}`,
    maxRequests: GLOBAL_RATE_LIMIT_MAX_REQUESTS,
    windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
    message: 'Too many requests from this IP. Please try again later.',
    details: { ip },
  });

  logger.debug({ ip }, 'Global rate limit check passed');
  next();
});

module.exports = {
  globalRateLimit,
  getClientIp,
};
