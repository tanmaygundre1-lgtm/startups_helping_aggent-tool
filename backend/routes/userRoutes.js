const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const { validateObjectId, validateProfileUpdate } = require('../middleware/validationMiddleware');
const {
  createProfile,
  createCandidateProfile,
  syncCurrentUser,
  getProfile,
  updateProfile,
  getPublicProfile,
  searchCandidates,
} = require('../controllers/userController');

const router = express.Router();

// Auth-synced user creation/update
router.post('/sync', authenticateUser, syncCurrentUser);
router.post('/profile', authenticateUser, createProfile);
router.post('/candidate-profile', authenticateUser, createCandidateProfile);

// Profile endpoints (protected)
router.get('/profile', authenticateUser, getProfile);
router.put('/profile', authenticateUser, validateProfileUpdate, updateProfile);

// Public profile by user ID
router.get('/profile/:userId', validateObjectId('userId'), getPublicProfile);

// Candidate search (protected — founders search for candidates)
router.post('/candidates/search', authenticateUser, searchCandidates);

module.exports = router;