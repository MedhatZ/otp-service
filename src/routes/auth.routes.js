const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { getMe, logout } = require('../controllers/auth.controller');

const router = express.Router();

router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);

module.exports = router;
