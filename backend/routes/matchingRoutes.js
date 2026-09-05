const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const { searchMatches, getCandidateMatch } = require('../controllers/matchingController');

const router = express.Router();

router.get('/search/with-scores', authenticateUser, searchMatches);
router.get('/matches/:ideaId', authenticateUser, getCandidateMatch);

module.exports = router;
