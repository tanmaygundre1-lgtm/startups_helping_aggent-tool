const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const { syncCurrentUser } = require('../controllers/userController');

const router = express.Router();

router.post('/sync', authenticateUser, syncCurrentUser);

module.exports = router;