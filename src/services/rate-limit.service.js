const redis = require('../config/redis');
const AppError = require('../utils/app-error');
const logger = require('../config/logger');

const getRetryAfterSeconds = (ttlMs) => Math.max(1, Math.ceil(ttlMs / 1000));

const ensureRedisConnection = async () => {
  if (redis.status !== 'ready' && redis.status !== 'connect') {
    await redis.connect();
  }
};

const incrWithWindow = async (key, windowMs) => {
  await ensureRedisConnection();
  const script = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("PEXPIRE", KEYS[1], ARGV[1])
    end
    local ttl = redis.call("PTTL", KEYS[1])
    return {current, ttl}
  `;

  const result = await redis.eval(script, 1, key, windowMs);
  return {
    count: Number(result[0]),
    ttlMs: Number(result[1]),
  };
};

const enforceRateLimit = async ({
  key,
  maxRequests,
  windowMs,
  message,
  details,
}) => {
  const { count, ttlMs } = await incrWithWindow(key, windowMs);
  if (count <= maxRequests) return;

  const retryAfter = getRetryAfterSeconds(ttlMs);
  logger.warn(
    { key, count, maxRequests, retryAfter },
    'Rate limit triggered'
  );
  throw new AppError(message, 429, details, {
    'Retry-After': String(retryAfter),
  });
};

const enforceResendCooldown = async ({ key, cooldownMs, message, details }) => {
  await ensureRedisConnection();
  const setResult = await redis.set(key, '1', 'PX', cooldownMs, 'NX');
  if (setResult === 'OK') return;

  const ttlMs = Number(await redis.pttl(key));
  const retryAfter = getRetryAfterSeconds(ttlMs > 0 ? ttlMs : cooldownMs);
  logger.warn({ key, retryAfter }, 'Resend cooldown triggered');
  throw new AppError(message, 429, details, {
    'Retry-After': String(retryAfter),
  });
};

module.exports = {
  enforceRateLimit,
  enforceResendCooldown,
};
