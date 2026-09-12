const Idea = require('../models/Idea');
const User = require('../models/User');
const vercelAI = require('../config/vercelAI');
const { calculateIdeaScore } = require('../services/scoringService');
const { normalizeSkills } = require('../config/taxonomies');

const findOwnedIdea = async (req, res) => {
  const user = await User.findOne({ firebaseUid: req.user.uid });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return null;
  }

  const idea = await Idea.findById(req.params.ideaId);
  if (!idea) {
    res.status(404).json({ success: false, message: 'Idea not found' });
    return null;
  }

  if (String(idea.createdBy) !== String(user._id)) {
    res.status(403).json({ success: false, message: 'Not authorized to access this idea' });
    return null;
  }

  return { user, idea };
};

const getFinalIdeaText = (idea) => ({
  title: idea.enhanced?.title || idea.title,
  description: idea.enhanced?.description || idea.description,
});

const normalizeRolesAndSkills = (rolesAndSkills = []) =>
  rolesAndSkills.map((role) => ({
    ...role,
    skills: normalizeSkills(role.skills),
  }));

// POST /api/ideas/:ideaId/enhance � transform stored founder text without scoring it
const enhanceIdea = async (req, res) => {
  try {
    const owned = await findOwnedIdea(req, res);
    if (!owned) return;

    const { idea } = owned;
    const rawTitle = req.body?.title || idea.title;
    const rawDescription = req.body?.description || idea.description;

    if (!idea.original?.title || !idea.original?.description) {
      idea.original = {
        title: idea.title,
        description: idea.description,
        capturedAt: new Date(),
      };
    }

    idea.status = 'enhancing';
    await idea.save();

    try {
      const enhancement = await vercelAI.generateEnhancement({ title: rawTitle, description: rawDescription });
      idea.enhanced = {
        title: enhancement.enhancedTitle,
        description: enhancement.refinedDescription,
        problem: enhancement.problem,
        solution: enhancement.solution,
        targetAudience: enhancement.targetAudience,
        valueProposition: enhancement.valueProposition,
        coreWorkflow: enhancement.coreWorkflow,
        updatedAt: new Date(),
      };
      idea.status = 'enhanced';
      await idea.save();

      return res.status(200).json({
        success: true,
        enhancedIdea: idea.enhanced,
      });
    } catch (aiError) {
      idea.status = idea.enhanced?.description ? 'enhanced' : 'draft';
      await idea.save();
      console.error('[AI ERROR] Enhancement failed:', aiError.message);
      return res.status(502).json({
        success: false,
        message: 'Idea enhancement failed. Please try again.',
      });
    }
  } catch (error) {
    console.error('[ERROR] POST /ideas/:ideaId/enhance:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to enhance idea' });
  }
};

// POST /api/ideas/:ideaId/analyze � generate evidence then score it deterministically
const analyzeIdea = async (req, res) => {
  try {
    const owned = await findOwnedIdea(req, res);
    if (!owned) return;

    const { idea } = owned;
    const finalIdea = getFinalIdeaText(idea);
    idea.status = 'analyzing';
    await idea.save();

    try {
      const generated = await vercelAI.generateAnalysis({
        title: finalIdea.title,
        description: finalIdea.description,
        category: idea.category,
        domain: idea.domain,
        requiredSkills: idea.requiredSkills,
      });

      const rolesAndSkills = normalizeRolesAndSkills(generated.rolesAndSkills);
      const scoring = calculateIdeaScore(generated.evidence);
      idea.aiAnalysis = {
        evidence: generated.evidence,
        scoring,
        rolesAndSkills,
        techStack: normalizeSkills(generated.techStack),
        domain: generated.domain,
        teamSize: generated.teamSize,
        keyRequirements: generated.keyRequirements,
        nextSteps: generated.nextSteps,
        analyzedAt: new Date(),
        isEdited: false,
        isApproved: false,
      };
      idea.status = 'analyzed';
      await idea.save();

      return res.status(200).json({
        success: true,
        message: 'Idea analyzed successfully',
        analysis: idea.aiAnalysis,
      });
    } catch (aiError) {
      idea.status = idea.enhanced?.description ? 'enhanced' : 'draft';
      await idea.save();
      console.error('[AI ERROR] Analysis failed:', aiError.message);
      return res.status(502).json({
        success: false,
        message: 'AI analysis failed. Please try again.',
      });
    }
  } catch (error) {
    console.error('[ERROR] POST /ideas/:ideaId/analyze:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to analyze idea' });
  }
};

const getAnalysis = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const idea = await Idea.findById(req.params.ideaId).select('aiAnalysis status createdBy');
    if (!idea) return res.status(404).json({ success: false, message: 'Idea not found' });

    const isOwner = user && String(idea.createdBy) === String(user._id);
    if (!isOwner && !idea.aiAnalysis?.isApproved) {
      return res.status(403).json({ success: false, message: 'Analysis not published yet' });
    }
    return res.status(200).json({ success: true, analysis: idea.aiAnalysis || null });
  } catch (error) {
    console.error('[ERROR] GET /ideas/:ideaId/analysis:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to get analysis' });
  }
};

const updateAnalysis = async (req, res) => {
  try {
    const owned = await findOwnedIdea(req, res);
    if (!owned) return;
    const { idea } = owned;
    const { rolesAndSkills, techStack, domain, teamSize, keyRequirements, nextSteps, approve } = req.body;

    if (!idea.aiAnalysis) {
      return res.status(400).json({ success: false, message: 'No analysis to update or approve' });
    }

    if (rolesAndSkills) idea.aiAnalysis.rolesAndSkills = normalizeRolesAndSkills(rolesAndSkills);
    if (techStack) idea.aiAnalysis.techStack = normalizeSkills(techStack);
    if (domain) idea.aiAnalysis.domain = domain;
    if (teamSize !== undefined) idea.aiAnalysis.teamSize = teamSize;
    if (keyRequirements) idea.aiAnalysis.keyRequirements = keyRequirements;
    if (nextSteps) idea.aiAnalysis.nextSteps = nextSteps;

    const edited = Boolean(rolesAndSkills || techStack || domain || teamSize !== undefined || keyRequirements || nextSteps);
    if (approve) {
      idea.aiAnalysis.isApproved = true;
      idea.aiAnalysis.approvedAt = new Date();
      idea.aiAnalysis.isEdited = edited;
      idea.status = 'matching';
    } else if (edited) {
      idea.aiAnalysis.isEdited = true;
    }

    await idea.save();
    return res.status(200).json({
      success: true,
      message: approve ? 'Analysis approved' : 'Analysis updated',
      analysis: idea.aiAnalysis,
    });
  } catch (error) {
    console.error('[ERROR] PUT /ideas/:ideaId/analysis:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update analysis' });
  }
};

module.exports = { enhanceIdea, analyzeIdea, getAnalysis, updateAnalysis };
