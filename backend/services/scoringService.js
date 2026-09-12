/**
 * Deterministic scoring engine for startup ideas.
 * Computes dimension scores (0-100) and weighted overall score from AI-extracted evidence.
 * AI never calculates final scores directly.
 */

const SCORING_VERSION = 'v1';

const WEIGHTS = {
  problemStrength: 0.25,
  marketPotential: 0.25,
  feasibility: 0.25,
  differentiation: 0.15,
  executionReadiness: 0.10,
};

const VERDICT_THRESHOLDS = {
  STRONG_POTENTIAL: 80,
  PROMISING: 65,
  NEEDS_REFINEMENT: 45,
  HIGH_RISK: 0,
};

function calculateProblemScore(problem = {}) {
  let score = 0;

  // Problem definition (max 40)
  if (problem.clearlyDefined === true) {
    score += 40;
  } else if (problem.clearlyDefined === false) {
    score += 10;
  }

  // Severity (max 35)
  const severity = String(problem.severity || '').toLowerCase();
  if (severity === 'high') {
    score += 35;
  } else if (severity === 'medium') {
    score += 25;
  } else {
    score += 10;
  }

  // Frequency (max 25)
  const frequency = String(problem.frequency || '').toLowerCase();
  if (frequency === 'high') {
    score += 25;
  } else if (frequency === 'medium') {
    score += 15;
  } else {
    score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

function calculateMarketScore(market = {}, audience = {}) {
  let score = 0;

  // Market reach (max 40)
  const reach = String(market.reach || '').toLowerCase();
  if (reach === 'large') {
    score += 40;
  } else if (reach === 'medium') {
    score += 25;
  } else {
    score += 10;
  }

  // Monetization potential (max 35)
  if (market.monetizable === true) {
    score += 35;
  } else {
    score += 10;
  }

  // Target audience clarity (max 15)
  if (audience.clearlyDefined === true) {
    score += 15;
  }

  // Audience accessibility (max 10)
  const accessibility = String(audience.accessibility || '').toLowerCase();
  if (accessibility === 'high') {
    score += 10;
  } else if (accessibility === 'medium') {
    score += 7;
  } else {
    score += 3;
  }

  return Math.min(Math.max(score, 0), 100);
}

function calculateFeasibilityScore(feasibility = {}) {
  let score = 0;

  // MVP Feasibility (max 40)
  const mvp = String(feasibility.mvpFeasibility || '').toLowerCase();
  if (mvp === 'high') {
    score += 40;
  } else if (mvp === 'medium') {
    score += 25;
  } else {
    score += 10;
  }

  // Technical complexity (lower is more feasible for MVP, max 30)
  const tech = String(feasibility.technicalComplexity || '').toLowerCase();
  if (tech === 'low') {
    score += 30;
  } else if (tech === 'medium') {
    score += 20;
  } else {
    score += 10;
  }

  // Resource requirements (lower is more feasible, max 30)
  const resources = String(feasibility.resourceRequirement || '').toLowerCase();
  if (resources === 'low') {
    score += 30;
  } else if (resources === 'medium') {
    score += 20;
  } else {
    score += 10;
  }

  return Math.min(Math.max(score, 0), 100);
}

function calculateDifferentiationScore(differentiation = {}) {
  let score = 0;

  // Unique value proposition (max 40)
  if (differentiation.hasUniqueValue === true) {
    score += 40;
  } else {
    score += 10;
  }

  // Differentiation strength (max 40)
  const strength = String(differentiation.differentiationStrength || '').toLowerCase();
  if (strength === 'high') {
    score += 40;
  } else if (strength === 'medium') {
    score += 25;
  } else {
    score += 10;
  }

  // Competition / blue ocean factor (max 20)
  if (differentiation.similarSolutionsKnown === false) {
    score += 20; // Unmet niche
  } else {
    score += 10; // Validated market with competition
  }

  return Math.min(Math.max(score, 0), 100);
}

function calculateExecutionScore(execution = {}) {
  let score = 0;

  // Idea clarity (max 50)
  const ideaClarity = String(execution.ideaClarity || '').toLowerCase();
  if (ideaClarity === 'high') {
    score += 50;
  } else if (ideaClarity === 'medium') {
    score += 30;
  } else {
    score += 10;
  }

  // Scope clarity (max 50)
  const scopeClarity = String(execution.scopeClarity || '').toLowerCase();
  if (scopeClarity === 'high') {
    score += 50;
  } else if (scopeClarity === 'medium') {
    score += 30;
  } else {
    score += 10;
  }

  return Math.min(Math.max(score, 0), 100);
}

function deriveVerdict(overallScore) {
  if (overallScore >= VERDICT_THRESHOLDS.STRONG_POTENTIAL) {
    return 'STRONG_POTENTIAL';
  }
  if (overallScore >= VERDICT_THRESHOLDS.PROMISING) {
    return 'PROMISING';
  }
  if (overallScore >= VERDICT_THRESHOLDS.NEEDS_REFINEMENT) {
    return 'NEEDS_REFINEMENT';
  }
  return 'HIGH_RISK';
}

/**
 * Calculates deterministic scores, breakdown, and verdict for a startup idea from evidence.
 * @param {Object} evidence - Structured evidence object from AI
 * @returns {Object} { version, overallScore, breakdown, verdict }
 */
function calculateIdeaScore(evidence = {}) {
  const safeEvidence = typeof evidence === 'object' && evidence !== null ? evidence : {};

  const problemStrength = calculateProblemScore(safeEvidence.problem);
  const marketPotential = calculateMarketScore(safeEvidence.market, safeEvidence.audience);
  const feasibility = calculateFeasibilityScore(safeEvidence.feasibility);
  const differentiation = calculateDifferentiationScore(safeEvidence.differentiation);
  const executionReadiness = calculateExecutionScore(safeEvidence.execution);

  const weightedScore =
    problemStrength * WEIGHTS.problemStrength +
    marketPotential * WEIGHTS.marketPotential +
    feasibility * WEIGHTS.feasibility +
    differentiation * WEIGHTS.differentiation +
    executionReadiness * WEIGHTS.executionReadiness;

  const overallScore = Math.round(weightedScore);
  const verdict = deriveVerdict(overallScore);

  return {
    version: SCORING_VERSION,
    overallScore,
    breakdown: {
      problemStrength,
      marketPotential,
      feasibility,
      differentiation,
      executionReadiness,
    },
    verdict,
  };
}

module.exports = {
  calculateIdeaScore,
  calculateProblemScore,
  calculateMarketScore,
  calculateFeasibilityScore,
  calculateDifferentiationScore,
  calculateExecutionScore,
  deriveVerdict,
  SCORING_VERSION,
  WEIGHTS,
  VERDICT_THRESHOLDS,
};
