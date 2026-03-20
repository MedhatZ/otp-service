const Redis = require('ioredis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL;

const redis = REDIS_URL
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null,
    })
  : null;

if (redis) {
  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (error) => logger.warn({ err: error }, 'Redis unavailable, fallback will be used'));
}

module.exports = redis;
