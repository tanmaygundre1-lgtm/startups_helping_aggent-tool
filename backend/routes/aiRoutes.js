const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const { validateObjectId, validateIdeaEnhance, validateAnalysisUpdate } = require('../middleware/validationMiddleware');
const { enhanceIdea, analyzeIdea, getAnalysis, updateAnalysis } = require('../controllers/aiController');

const router = express.Router();

// AI enhancement and analysis endpoints (protected)
router.post('/:ideaId/enhance', authenticateUser, validateObjectId('ideaId'), validateIdeaEnhance, enhanceIdea);
router.post('/:ideaId/analyze', authenticateUser, validateObjectId('ideaId'), analyzeIdea);
router.get('/:ideaId/analysis', authenticateUser, validateObjectId('ideaId'), getAnalysis);
router.put('/:ideaId/analysis', authenticateUser, validateObjectId('ideaId'), validateAnalysisUpdate, updateAnalysis);

module.exports = router;