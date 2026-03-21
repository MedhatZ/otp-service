const { randomUUID } = require('crypto');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const { normalizePhone } = require('../utils/phone.util');

let initPromise;

const mapUserRow = (row) => ({
  id: row.id,
  phoneNumber: row.phone_number,
  createdAt: row.created_at,
  firstLoginAt: row.first_login_at ?? null,
  lastLoginAt: row.last_login_at ?? null,
});

const initUsersTable = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          phone_number TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users (phone_number);
      `);
      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP NULL;
      `);
      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_logins (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          ip TEXT,
          user_agent TEXT,
          metadata JSONB
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins (user_id);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_logins_created_at ON user_logins (created_at);
      `);
    })();
  }
  return initPromise;
};

const findUserByPhone = async (phoneNumber) => {
  try {
    await initUsersTable();
    const normalizedPhone = normalizePhone(phoneNumber);
    const result = await pool.query(
      `SELECT *
       FROM users
       WHERE phone_number = $1
       LIMIT 1`,
      [normalizedPhone]
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  } catch (error) {
    throw new AppError('Failed to fetch user by phone.', 500, {
      reason: 'database_error',
    });
  }
};

const findUserById = async (id) => {
  try {
    await initUsersTable();
    const result = await pool.query(
      `SELECT *
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  } catch (error) {
    throw new AppError('Failed to fetch user by id.', 500, {
      reason: 'database_error',
    });
  }
};

const createUser = async (phoneNumber) => {
  await initUsersTable();
  const normalizedPhone = normalizePhone(phoneNumber);
  const id = randomUUID();

  try {
    const result = await pool.query(
      `INSERT INTO users (id, phone_number)
       VALUES ($1, $2)
       RETURNING *`,
      [id, normalizedPhone]
    );

    return mapUserRow(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      const existing = await findUserByPhone(normalizedPhone);
      if (existing) return existing;
      throw new AppError('User with this phone already exists.', 409);
    }
    throw new AppError('Failed to persist user.', 500, {
      reason: 'database_error',
    });
  }
};

const setFirstLogin = async (userId) => {
  await initUsersTable();
  try {
    await pool.query(
      `UPDATE users
       SET first_login_at = NOW(), last_login_at = NOW()
       WHERE id = $1 AND first_login_at IS NULL`,
      [userId]
    );
  } catch (error) {
    throw new AppError('Failed to set first login.', 500, {
      reason: 'database_error',
    });
  }
};

const updateLastLogin = async (userId) => {
  await initUsersTable();
  try {
    await pool.query(
      `UPDATE users
       SET last_login_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    throw new AppError('Failed to update last login.', 500, {
      reason: 'database_error',
    });
  }
};

const SORT_WHITELIST = {
  created_at: 'created_at',
  last_login_at: 'last_login_at',
};

const findUsersPaginated = async ({
  page = 1,
  limit = 20,
  sort = 'created_at',
  order = 'asc',
}) => {
  try {
    await initUsersTable();
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const sortColumn = SORT_WHITELIST[sort] || SORT_WHITELIST.created_at;
    const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const offset = (safePage - 1) * safeLimit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM users`
    );
    const total = countResult.rows[0]?.total ?? 0;

    const dataResult = await pool.query(
      `SELECT *
       FROM users
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $1 OFFSET $2`,
      [safeLimit, offset]
    );

    return {
      data: dataResult.rows.map(mapUserRow),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
      },
    };
  } catch (error) {
    throw new AppError('Failed to list users.', 500, {
      reason: 'database_error',
    });
  }
};

module.exports = {
  initUsersTable,
  findUserByPhone,
  findUserById,
  createUser,
  setFirstLogin,
  updateLastLogin,
  findUsersPaginated,
};
