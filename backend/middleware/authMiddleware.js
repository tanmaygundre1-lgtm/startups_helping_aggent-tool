const { getAuth } = require('firebase-admin/auth');
const firebaseAdminApp = require('../config/firebaseAdmin');

const authenticateUser = async (req, res, next) => {
  const authorizationHeader = req.get('Authorization');

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authentication required',
    });
  }

  const idToken = authorizationHeader.slice('Bearer '.length).trim();

  if (!idToken) {
    return res.status(401).json({
      message: 'Authentication required',
    });
  }

  try {
    const decodedUser = await getAuth(firebaseAdminApp).verifyIdToken(idToken);
    req.user = decodedUser;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired authentication token',
    });
  }
};

module.exports = authenticateUser;
