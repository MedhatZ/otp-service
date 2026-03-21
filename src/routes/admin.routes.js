const express = require('express');
const { listUsers } = require('../controllers/admin.controller');
const requireAdminKey = require('../middlewares/admin-auth.middleware');

const router = express.Router();

router.get('/users', requireAdminKey, listUsers);

module.exports = router;
