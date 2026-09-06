const mongoose = require('mongoose');
const Idea = require('../models/Idea');
const User = require('../models/User');
const Match = require('../models/Match');
const { scoreCandidate, flattenRequirements } = require('../services/matchScoring');

const publicCandidateFields =
  'name profileImage college location skills interests targetRoles domainInterests availability workPreference hoursPerWeek createdAt';

const parseList = (value) => (value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : []);
const parsePage = (value, fallback, max) => Math.min(Math.max(Number.parseInt(value, 10) || fallback, 1), max);

const getAuthenticatedUser = (req) => User.findOne({ firebaseUid: req.user.uid });

const toPublicCandidate = (candidate) => ({
  id: candidate._id,
  name: candidate.name,
  profileImage: candidate.profileImage,
  college: candidate.college,
  location: candidate.location,
  skills: candidate.skills,
  interests: candidate.interests,
  targetRoles: candidate.targetRoles,
  domainInterests: candidate.domainInterests,
  availability: candidate.availability,
  workPreference: candidate.workPreference,
  hoursPerWeek: candidate.hoursPerWeek,
});

const buildCandidateQuery = ({ skills, level, domain, workMode, availability }) => {
  const query = { profileType: 'candidate', profileCompleted: true };
  const andConditions = [];

  if (skills.length) {
    query['skills.name'] = { $all: skills };
  }

  if (level && skills.length) {
    // Keep $all for must-have names, and require at least one named skill at the requested level.
    andConditions.push({ skills: { $elemMatch: { name: { $in: skills }, level } } });
  } else if (level) {
    query.skills = { $elemMatch: { level } };
  }

  if (domain) query.domainInterests = domain;
  if (workMode) query.workPreference = workMode;
  if (availability) query.availability = availability;
  if (andConditions.length) query.$and = andConditions;

  return query;
};

const searchMatches = async (req, res) => {
  try {
    const { ideaId, level, domain, workMode, availability, sort = 'best' } = req.query;
    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      return res.status(400).json({ success: false, message: 'Invalid idea ID format', code: 'INVALID_ID' });
    }
    const founder = await getAuthenticatedUser(req);
    if (!founder) return res.status(401).json({ success: false, message: 'User profile not found', code: 'USER_NOT_FOUND' });

    const idea = await Idea.findById(ideaId).lean();
    if (!idea) return res.status(404).json({ success: false, message: 'Idea not found', code: 'IDEA_NOT_FOUND' });
    if (idea.createdBy.toString() !== founder._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to match this idea', code: 'NOT_OWNER' });
    }
    if (!idea.aiAnalysis || !idea.aiAnalysis.isApproved) {
      return res.status(409).json({ success: false, message: 'Idea analysis must be approved before matching', code: 'ANALYSIS_NOT_APPROVED' });
    }

    const requestedSkills = parseList(req.query.skills);
    const page = parsePage(req.query.page, 1, 1000000);
    const limit = parsePage(req.query.limit, 10, 50);
    const minScore = Math.min(Math.max(Number(req.query.minScore ?? 40) || 0, 0), 100);
    const query = buildCandidateQuery({
      skills: requestedSkills,
      level,
      domain,
      workMode,
      availability,
    });

    const candidates = await User.find(query).select(publicCandidateFields).lean();
    const requirements = {
      ...idea.aiAnalysis,
      domain: idea.domain || idea.aiAnalysis?.domain,
      requiredSkills: idea.requiredSkills || [],
      requiredRoles: idea.requiredRoles || [],
      availability: idea.availability,
      workPreference: idea.workPreference,
      hoursPerWeek: idea.hoursPerWeek,
    };

    const matches = [];
    for (const candidate of candidates) {
      const explanation = scoreCandidate(candidate, requirements);
      if (explanation.score < minScore) continue;
      const snapshot = await Match.findOneAndUpdate(
        { ideaId: idea._id, userId: candidate._id },
        {
          $set: {
            matchedSkills: explanation.matchedSkills,
            matchScore: explanation.score,
            explanation,
            scoringVersion: explanation.scoringVersion,
            requirementsSnapshot: flattenRequirements(requirements),
            calculatedAt: new Date(),
            refreshedAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      ).lean();
      matches.push({
        matchId: snapshot._id,
        candidate: toPublicCandidate(candidate),
        score: explanation.score,
        explanation,
        invitationStatus: null,
        createdAt: candidate.createdAt,
      });
    }

    matches.sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0) ||
        String(a.candidate.id).localeCompare(String(b.candidate.id)),
    );
    const total = matches.length;
    const offset = (page - 1) * limit;
    const paged = matches.slice(offset, offset + limit);
    return res.status(200).json({
      success: true,
      matches: paged,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
      sort,
      minScore,
    });
  } catch (error) {
    console.error('[ERROR] GET /candidates/search/with-scores:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to calculate candidate matches', code: 'MATCHING_FAILED' });
  }
};

const getCandidateMatch = async (req, res) => {
  try {
    const { ideaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ideaId)) return res.status(400).json({ success: false, message: 'Invalid idea ID format' });
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User profile not found' });
    let match = await Match.findOne({ ideaId, userId: user._id }).select('ideaId matchScore explanation scoringVersion calculatedAt refreshedAt').lean();

    if (!match) {
      const idea = await Idea.findById(ideaId).lean();
      if (!idea) return res.status(404).json({ success: false, message: 'Idea not found' });

      const requirements = {
        ...(idea.aiAnalysis || {}),
        domain: idea.domain || idea.aiAnalysis?.domain,
        requiredSkills: idea.requiredSkills || [],
        requiredRoles: idea.requiredRoles || [],
        availability: idea.availability,
        workPreference: idea.workPreference,
        hoursPerWeek: idea.hoursPerWeek,
      };

      const explanation = scoreCandidate(user, requirements);
      match = await Match.findOneAndUpdate(
        { ideaId: idea._id, userId: user._id },
        {
          $set: {
            matchedSkills: explanation.matchedSkills,
            matchScore: explanation.score,
            explanation,
            scoringVersion: explanation.scoringVersion,
            requirementsSnapshot: flattenRequirements(requirements),
            calculatedAt: new Date(),
            refreshedAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      ).lean();
    }

    return res.status(200).json({ success: true, match });
  } catch (error) {
    console.error('[ERROR] GET /candidates/matches/:ideaId:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to get match' });
  }
};

module.exports = { searchMatches, getCandidateMatch };
