const User = require('../models/User');

const createProfile = async (req, res) => {
  try {
    const { profileType, companyStage, expertiseAreas, lookingFor, yearsExperience, bio } = req.body;
    if (profileType !== 'founder') {
      return res.status(400).json({ error: 'profileType must be founder', code: 'INVALID_PROFILE_TYPE' });
    }
    if (await User.exists({ firebaseUid: req.user.uid })) {
      return res.status(409).json({ error: 'Profile already exists', code: 'PROFILE_EXISTS' });
    }
    const user = await User.create({ firebaseUid: req.user.uid, email: req.user.email, name: req.user.name || req.user.email || req.user.uid, profileType, companyStage, expertiseAreas, lookingFor, yearsExperience, bio });
    console.log(`[PROFILE] founder created: ${user.firebaseUid}`);
    return res.status(201).json({ userId: user._id, profileType: user.profileType, companyStage: user.companyStage, message: 'Profile created' });
  } catch (error) {
    console.error('[ERROR] POST /profile:', error.message);
    return res.status(500).json({ error: 'Failed to create profile', code: 'PROFILE_CREATE_FAILED' });
  }
};

const createCandidateProfile = async (req, res) => {
  try {
    const { targetRoles, skills, availability, location, experience, qualifications } = req.body;
    if (!Array.isArray(skills) || !Array.isArray(targetRoles)) {
      return res.status(400).json({ error: 'skills and targetRoles must be arrays', code: 'INVALID_PROFILE' });
    }
    if (await User.exists({ firebaseUid: req.user.uid })) {
      return res.status(409).json({ error: 'Profile already exists', code: 'PROFILE_EXISTS' });
    }
    const user = await User.create({ firebaseUid: req.user.uid, email: req.user.email, name: req.user.name || req.user.email || req.user.uid, profileType: 'candidate', targetRoles, skills, availability, location, experience, qualifications });
    return res.status(201).json({ userId: user._id, profileType: user.profileType, message: 'Candidate profile created' });
  } catch (error) {
    console.error('[ERROR] POST /candidate-profile:', error.message);
    return res.status(500).json({ error: 'Failed to create candidate profile', code: 'PROFILE_CREATE_FAILED' });
  }
};

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

// Get the current user's full profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[ERROR] GET /profile:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// Complete / update profile with role-specific fields
const updateProfile = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const {
      name, profileType, college, location, skills, interests,
      bio, expertiseAreas, lookingFor,
      targetRoles, domainInterests, availability, hoursPerWeek, workPreference,
    } = req.body;

    // Allow setting profileType only if not already set or if still default
    if (profileType && ['founder', 'candidate'].includes(profileType)) {
      user.profileType = profileType;
    }

    if (name) user.name = name;
    if (college) user.college = college;
    if (location) user.location = location;
    if (skills) user.skills = skills;
    if (interests) user.interests = interests;

    // Founder-specific
    if (bio !== undefined) user.bio = bio;
    if (expertiseAreas) user.expertiseAreas = expertiseAreas;
    if (lookingFor) user.lookingFor = lookingFor;

    // Candidate-specific
    if (targetRoles) user.targetRoles = targetRoles;
    if (domainInterests) user.domainInterests = domainInterests;
    if (availability) user.availability = availability;
    if (hoursPerWeek !== undefined) user.hoursPerWeek = hoursPerWeek;
    if (workPreference) user.workPreference = workPreference;

    // Mark profile as completed if key fields are set
    const hasBasics = user.name && user.profileType;
    const hasFounderFields = user.profileType === 'founder' && user.bio;
    const hasCandidateFields = user.profileType === 'candidate' && user.skills.length > 0;
    if (hasBasics && (hasFounderFields || hasCandidateFields)) {
      user.profileCompleted = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('[ERROR] PUT /profile:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// Get a specific user's public profile by ID
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      'name profileImage profileType college location skills interests targetRoles domainInterests availability workPreference'
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[ERROR] GET /profile/:userId:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to get user profile' });
  }
};

// Search candidates by skills, roles, domain, work preference
const searchCandidates = async (req, res) => {
  try {
    const { skills, targetRoles, domainInterests, workPreference, availability, limit = 20, skip = 0 } = req.body;

    const query = { profileType: 'candidate', profileCompleted: true };

    if (skills && skills.length > 0) {
      query['skills.name'] = { $in: skills };
    }
    if (targetRoles && targetRoles.length > 0) {
      query.targetRoles = { $in: targetRoles };
    }
    if (domainInterests && domainInterests.length > 0) {
      query.domainInterests = { $in: domainInterests };
    }
    if (workPreference) {
      query.workPreference = workPreference;
    }
    if (availability) {
      query.availability = availability;
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const safeSkip = Math.max(Number(skip) || 0, 0);

    const [candidates, total] = await Promise.all([
      User.find(query)
        .select('name profileImage college location skills interests targetRoles domainInterests availability workPreference hoursPerWeek')
        .limit(safeLimit)
        .skip(safeSkip)
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      candidates,
      total,
      limit: safeLimit,
      skip: safeSkip,
    });
  } catch (error) {
    console.error('[ERROR] POST /candidates/search:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to search candidates' });
  }
};

module.exports = { createProfile, createCandidateProfile, syncCurrentUser, getProfile, updateProfile, getPublicProfile, searchCandidates };