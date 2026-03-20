const redis = require('../config/redis');
const AppError = require('../utils/app-error');
const logger = require('../config/logger');

const getRetryAfterSeconds = (ttlMs) => Math.max(1, Math.ceil(ttlMs / 1000));
const memoryStore = new Map();
let hasLoggedRedisFallback = false;

const logRedisFallbackOnce = () => {
  if (!hasLoggedRedisFallback) {
    hasLoggedRedisFallback = true;
    logger.warn('Redis disabled/unavailable. Using in-memory rate limit fallback.');
  }
};

const useMemoryIncrement = (key, windowMs) => {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + windowMs;
    memoryStore.set(key, { count: 1, expiresAt });
    return { count: 1, ttlMs: windowMs };
  }

  existing.count += 1;
  const ttlMs = Math.max(1, existing.expiresAt - now);
  return { count: existing.count, ttlMs };
};

const useMemoryCooldown = (key, cooldownMs) => {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + cooldownMs });
    return { allowed: true, ttlMs: cooldownMs };
  }

  return {
    allowed: false,
    ttlMs: Math.max(1, existing.expiresAt - now),
  };
};

const ensureRedisConnection = async () => {
  if (!redis) return false;

  if (redis.status !== 'ready' && redis.status !== 'connect') {
    await redis.connect();
  }

  return true;
};

const incrWithWindow = async (key, windowMs) => {
  let redisReady = false;
  try {
    redisReady = await ensureRedisConnection();
  } catch (error) {
    logRedisFallbackOnce();
  }

  if (!redisReady) {
    return useMemoryIncrement(key, windowMs);
  }

  const script = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("PEXPIRE", KEYS[1], ARGV[1])
    end
    local ttl = redis.call("PTTL", KEYS[1])
    return {current, ttl}
  `;

  try {
    const result = await redis.eval(script, 1, key, windowMs);
    return {
      count: Number(result[0]),
      ttlMs: Number(result[1]),
    };
  } catch (error) {
    logRedisFallbackOnce();
    return useMemoryIncrement(key, windowMs);
  }
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
  let redisReady = false;
  try {
    redisReady = await ensureRedisConnection();
  } catch (error) {
    logRedisFallbackOnce();
  }

  if (!redisReady) {
    const { allowed, ttlMs } = useMemoryCooldown(key, cooldownMs);
    if (allowed) return;

    const retryAfter = getRetryAfterSeconds(ttlMs);
    logger.warn({ key, retryAfter }, 'Resend cooldown triggered');
    throw new AppError(message, 429, details, {
      'Retry-After': String(retryAfter),
    });
  }

  try {
    const setResult = await redis.set(key, '1', 'PX', cooldownMs, 'NX');
    if (setResult === 'OK') return;

    const ttlMs = Number(await redis.pttl(key));
    const retryAfter = getRetryAfterSeconds(ttlMs > 0 ? ttlMs : cooldownMs);
    logger.warn({ key, retryAfter }, 'Resend cooldown triggered');
    throw new AppError(message, 429, details, {
      'Retry-After': String(retryAfter),
    });
  } catch (error) {
    if (error instanceof AppError) throw error;

    logRedisFallbackOnce();
    const { allowed, ttlMs } = useMemoryCooldown(key, cooldownMs);
    if (allowed) return;

    const retryAfter = getRetryAfterSeconds(ttlMs);
    logger.warn({ key, retryAfter }, 'Resend cooldown triggered');
    throw new AppError(message, 429, details, {
      'Retry-After': String(retryAfter),
    });
  }
};

module.exports = {
  enforceRateLimit,
  enforceResendCooldown,
};
