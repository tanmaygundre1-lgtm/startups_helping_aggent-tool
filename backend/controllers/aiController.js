const Idea = require('../models/Idea');
const User = require('../models/User');
const { generateAnalysis } = require('../config/vercelAI');

// POST /api/ideas/:ideaId/analyze — Trigger AI analysis of an idea (founder only)
const analyzeIdea = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const idea = await Idea.findById(req.params.ideaId);
    if (!idea) {
      return res.status(404).json({ success: false, message: 'Idea not found' });
    }

    if (idea.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to analyze this idea' });
    }

    // Set status to analyzing
    idea.status = 'analyzing';
    await idea.save();

    try {
      const analysis = await generateAnalysis({
        title: idea.title,
        description: idea.description,
        category: idea.category,
        domain: idea.domain,
        requiredSkills: idea.requiredSkills,
      });

      idea.aiAnalysis = {
        ...analysis,
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
      console.error('[AI ERROR] Analysis failed:', aiError.message);
      idea.status = 'draft';
      await idea.save();
      return res.status(502).json({
        success: false,
        message: 'AI analysis failed. Please try again.',
        error: aiError.message,
      });
    }
  } catch (error) {
    console.error('[ERROR] POST /ideas/:ideaId/analyze:', error.message);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid idea ID format' });
    }
    return res.status(500).json({ success: false, message: 'Failed to analyze idea' });
  }
};

// GET /api/ideas/:ideaId/analysis — Get analysis results (founder own idea or public)
const getAnalysis = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const idea = await Idea.findById(req.params.ideaId).select('aiAnalysis status createdBy');

    if (!idea) {
      return res.status(404).json({ success: false, message: 'Idea not found' });
    }

    // Only owner can view non-approved analysis
    const isOwner = user && idea.createdBy.toString() === user._id.toString();
    if (!isOwner && !(idea.aiAnalysis && idea.aiAnalysis.isApproved)) {
      return res.status(403).json({ success: false, message: 'Analysis not published yet' });
    }

    return res.status(200).json({ success: true, analysis: idea.aiAnalysis || null });
  } catch (error) {
    console.error('[ERROR] GET /ideas/:ideaId/analysis:', error.message);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid idea ID format' });
    }
    return res.status(500).json({ success: false, message: 'Failed to get analysis' });
  }
};

// PUT /api/ideas/:ideaId/analysis — Update analysis (founder edits AI suggestions) or approve
const updateAnalysis = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const idea = await Idea.findById(req.params.ideaId);
    if (!idea) {
      return res.status(404).json({ success: false, message: 'Idea not found' });
    }

    if (idea.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this analysis' });
    }

    const { rolesAndSkills, techStack, domain, teamSize, keyRequirements, nextSteps, approve } = req.body;

    // If approving, require existing analysis
    if (approve && !idea.aiAnalysis) {
      return res.status(400).json({ success: false, message: 'No analysis to approve' });
    }

    // Edit fields if provided
    if (rolesAndSkills) idea.aiAnalysis.rolesAndSkills = rolesAndSkills;
    if (techStack) idea.aiAnalysis.techStack = techStack;
    if (domain) idea.aiAnalysis.domain = domain;
    if (teamSize !== undefined) idea.aiAnalysis.teamSize = teamSize;
    if (keyRequirements) idea.aiAnalysis.keyRequirements = keyRequirements;
    if (nextSteps) idea.aiAnalysis.nextSteps = nextSteps;

    if (approve) {
      idea.aiAnalysis.isApproved = true;
      idea.aiAnalysis.approvedAt = new Date();
      idea.aiAnalysis.isEdited = Boolean(
        rolesAndSkills || techStack || domain || teamSize !== undefined || keyRequirements || nextSteps
      );
      idea.status = 'matching';
    } else {
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
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid idea ID format' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update analysis' });
  }
};

module.exports = { analyzeIdea, getAnalysis, updateAnalysis };