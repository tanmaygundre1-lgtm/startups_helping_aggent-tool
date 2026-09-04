const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const { validateObjectId, validateIdeaCreate } = require('../middleware/validationMiddleware');
const {
  createIdea,
  listIdeas,
  getIdea,
  updateIdea,
  deleteIdea,
  discoverIdeas,
} = require('../controllers/ideaController');

const router = express.Router();

// Discover open ideas (protected — candidates browse ideas)
router.get('/discover', authenticateUser, discoverIdeas);

// Idea CRUD (protected)
router.post('/', authenticateUser, validateIdeaCreate, createIdea);
router.get('/', authenticateUser, listIdeas);
router.get('/:ideaId', authenticateUser, validateObjectId('ideaId'), getIdea);
router.put('/:ideaId', authenticateUser, validateObjectId('ideaId'), updateIdea);
router.delete('/:ideaId', authenticateUser, validateObjectId('ideaId'), deleteIdea);

module.exports = router;
