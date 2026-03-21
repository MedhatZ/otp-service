const asyncHandler = require('../middlewares/async-handler.middleware');
const { findUsersPaginated } = require('../services/user.service');

const listUsers = asyncHandler(async (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit;
  const sort = req.query.sort;
  const order = req.query.order;

  const { data, pagination } = await findUsersPaginated({
    page,
    limit,
    sort,
    order,
  });

  return res.status(200).json({
    success: true,
    message: 'Users retrieved successfully.',
    data: {
      data,
      pagination,
    },
  });
});

module.exports = {
  listUsers,
};
