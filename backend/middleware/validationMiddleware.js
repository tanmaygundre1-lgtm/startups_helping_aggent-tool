const mongoose = require('mongoose');

/**
 * Lightweight validation helpers. Avoids adding express-validator as a
 * dependency for the MVP — we already do field-level checks in controllers.
 * This middleware is used for ID format and common request-shape checks.
 */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateObjectId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName} format`,
    });
  }
  return next();
};

const validateProfileUpdate = (req, res, next) => {
  const { profileType, skills, hoursPerWeek, availability, workPreference } = req.body;

  if (profileType && !['founder', 'candidate'].includes(profileType)) {
    return res.status(400).json({
      success: false,
      message: 'profileType must be "founder" or "candidate"',
    });
  }

  if (skills && !Array.isArray(skills)) {
    return res.status(400).json({
      success: false,
      message: 'skills must be an array of { name, level } objects',
    });
  }

  if (skills) {
    const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
    for (const skill of skills) {
      if (!skill.name || !skill.level || !validLevels.includes(skill.level)) {
        return res.status(400).json({
          success: false,
          message: 'Each skill must have a name and a valid level (Beginner, Intermediate, Advanced)',
        });
      }
    }
  }

  if (hoursPerWeek !== undefined && (typeof hoursPerWeek !== 'number' || hoursPerWeek < 0 || hoursPerWeek > 80)) {
    return res.status(400).json({
      success: false,
      message: 'hoursPerWeek must be a number between 0 and 80',
    });
  }

  if (availability && !['full-time', 'part-time', 'flexible', ''].includes(availability)) {
    return res.status(400).json({
      success: false,
      message: 'availability must be full-time, part-time, or flexible',
    });
  }

  if (workPreference && !['remote', 'in-person', 'hybrid', ''].includes(workPreference)) {
    return res.status(400).json({
      success: false,
      message: 'workPreference must be remote, in-person, or hybrid',
    });
  }

  return next();
};

const validateIdeaCreate = (req, res, next) => {
  const { title, description } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Title is required (min 3 characters)',
    });
  }

  if (!description || typeof description !== 'string' || description.trim().length < 20) {
    return res.status(400).json({
      success: false,
      message: 'Description is required (min 20 characters)',
    });
  }

  return next();
};

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 4000;

const validateIdeaEnhance = (req, res, next) => {
  const { title, description } = req.body || {};

  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > TITLE_MAX)) {
    return res.status(400).json({
      success: false,
      message: `If provided, title must be ${3}-${TITLE_MAX} characters`,
    });
  }

  if (description !== undefined && (typeof description !== 'string' || description.trim().length < 20 || description.trim().length > DESCRIPTION_MAX)) {
    return res.status(400).json({
      success: false,
      message: `If provided, description must be ${20}-${DESCRIPTION_MAX} characters`,
    });
  }

  return next();
};

const validateAnalysisUpdate = (req, res, next) => {
  const { rolesAndSkills, teamSize } = req.body;

  if (rolesAndSkills) {
    if (!Array.isArray(rolesAndSkills) || rolesAndSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'rolesAndSkills must be a non-empty array',
      });
    }
    for (const role of rolesAndSkills) {
      if (!role.role) {
        return res.status(400).json({
          success: false,
          message: 'Each role must have a role name',
        });
      }
    }
  }

  if (teamSize !== undefined && (typeof teamSize !== 'number' || teamSize < 1)) {
    return res.status(400).json({
      success: false,
      message: 'teamSize must be a number >= 1',
    });
  }

  return next();
};

module.exports = {
  validateObjectId,
  validateProfileUpdate,
  validateIdeaCreate,
  validateIdeaEnhance,
  validateAnalysisUpdate,
  isValidObjectId,
  TITLE_MAX,
  DESCRIPTION_MAX,
};
