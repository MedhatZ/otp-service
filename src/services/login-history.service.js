const { randomUUID } = require('crypto');
const pool = require('../config/db');
const { initUsersTable } = require('./user.service');

const recordUserLogin = async ({ userId, ip, userAgent, metadata }) => {
  await initUsersTable();
  await pool.query(
    `INSERT INTO user_logins (id, user_id, ip, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      randomUUID(),
      userId,
      ip ?? null,
      userAgent ?? null,
      metadata != null ? metadata : null,
    ]
  );
};

module.exports = {
  recordUserLogin,
};
