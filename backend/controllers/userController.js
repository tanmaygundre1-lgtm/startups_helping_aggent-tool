const User = require('../models/User');

const getFirstValue = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim())?.trim();

const syncCurrentUser = async (req, res) => {
  const firebaseUid = req.user.uid;
  const firebaseEmail = req.user.email;
  const firebaseName = req.user.name;
  const firebasePicture = req.user.picture;
  const requestedName = typeof req.body?.name === 'string' ? req.body.name : '';
  const requestedProfileImage =
    typeof req.body?.profileImage === 'string' ? req.body.profileImage : '';

  const userData = {
    firebaseUid,
    email: firebaseEmail,
    name: getFirstValue(requestedName, firebaseName, firebaseEmail, firebaseUid),
    profileImage: getFirstValue(requestedProfileImage, firebasePicture),
    college: { name: '' },
    location: { city: '', state: '', region: '' },
    skills: [],
    interests: [],
    profileCompleted: false,
  };

  try {
    let user = await User.findOne({ firebaseUid });

    if (!user) {
      try {
        user = await User.create(userData);
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }

        user = await User.findOne({ firebaseUid });
        if (!user) {
          throw error;
        }
      }
    } else {
      const updates = {};

      if (firebaseEmail && firebaseEmail !== user.email) {
        updates.email = firebaseEmail;
      }

      const safeName = getFirstValue(requestedName, firebaseName);
      if (safeName && safeName !== user.name) {
        updates.name = safeName;
      }

      const safeProfileImage = getFirstValue(requestedProfileImage, firebasePicture);
      if (safeProfileImage && safeProfileImage !== user.profileImage) {
        updates.profileImage = safeProfileImage;
      }

      if (Object.keys(updates).length > 0) {
        user = await User.findOneAndUpdate({ firebaseUid }, updates, {
          new: true,
          runValidators: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'User synchronized successfully',
      user,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with these Firebase or email details already exists',
      });
    }

    console.error('User synchronization failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to synchronize user with MongoDB',
    });
  }
};

module.exports = { syncCurrentUser };