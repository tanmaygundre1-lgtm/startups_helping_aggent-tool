const express = require('express');
const authenticateUser = require('../middleware/authMiddleware');
const {
  sendInvitation,
  listInvitations,
  getInvitation,
  acceptInvitation,
  declineInvitation,
  withdrawInvitation,
} = require('../controllers/invitationController');

const router = express.Router();
router.use(authenticateUser);
router.post('/', sendInvitation);
router.get('/', listInvitations);
router.get('/:invitationId', getInvitation);
router.put('/:invitationId/accept', acceptInvitation);
router.put('/:invitationId/decline', declineInvitation);
router.put('/:invitationId/withdraw', withdrawInvitation);

module.exports = router;
