const asyncHandler = require('../middlewares/async-handler.middleware');

const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Current user fetched successfully.',
    data: {
      user: req.user,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = {
  getMe,
  logout,
};
