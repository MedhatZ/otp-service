const { randomUUID } = require('crypto');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const { normalizePhone } = require('../utils/phone.util');

let initPromise;

const mapUserRow = (row) => ({
  id: row.id,
  phoneNumber: row.phone_number,
  createdAt: row.created_at,
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

module.exports = {
  initUsersTable,
  findUserByPhone,
  findUserById,
  createUser,
};
