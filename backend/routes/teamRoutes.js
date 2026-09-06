const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const { createTeam, getTeam, listTeams } = require('../controllers/teamController');

const router = express.Router();

router.use(authenticateUser);
router.post('/', createTeam);
router.get('/', listTeams);
router.get('/:teamId', getTeam);

module.exports = router;
