const AppError = require('../utils/app-error');
const asyncHandler = require('./async-handler.middleware');

const requireAdminKey = asyncHandler(async (req, res, next) => {
  const provided = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_KEY;

  if (!expected || !provided || provided !== expected) {
    throw new AppError('Unauthorized', 401);
  }

  next();
});

module.exports = requireAdminKey;
