const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const { createTeam, getTeam, listTeams, addTeamMember } = require('../controllers/teamController');
const { getTeamMessages, sendTeamMessage } = require('../controllers/chatController');

const router = express.Router();

router.use(authenticateUser);
router.post('/', createTeam);
router.get('/', listTeams);
router.post('/:teamId/members', addTeamMember);
router.get('/:teamId/messages', getTeamMessages);
router.post('/:teamId/messages', sendTeamMessage);
router.get('/:teamId', getTeam);

module.exports = router;
