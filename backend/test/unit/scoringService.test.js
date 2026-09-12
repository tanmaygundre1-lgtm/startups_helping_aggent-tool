const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateIdeaScore,
  deriveVerdict,
  SCORING_VERSION,
} = require('../../services/scoringService');

const strongEvidence = {
  problem: { clearlyDefined: true, frequency: 'high', severity: 'high' },
  audience: { clearlyDefined: true, accessibility: 'high' },
  market: { reach: 'large', monetizable: true },
  feasibility: {
    technicalComplexity: 'low',
    resourceRequirement: 'low',
    mvpFeasibility: 'high',
  },
  differentiation: {
    similarSolutionsKnown: false,
    hasUniqueValue: true,
    differentiationStrength: 'high',
  },
  execution: { ideaClarity: 'high', scopeClarity: 'high' },
};

test('calculates deterministic scores from fixed evidence', () => {
  const first = calculateIdeaScore(strongEvidence);
  const second = calculateIdeaScore(structuredClone(strongEvidence));

  assert.deepEqual(first, second);
  assert.equal(first.version, SCORING_VERSION);
  assert.equal(first.overallScore, 100);
  assert.equal(first.verdict, 'STRONG_POTENTIAL');
  assert.deepEqual(first.breakdown, {
    problemStrength: 100,
    marketPotential: 100,
    feasibility: 100,
    differentiation: 100,
    executionReadiness: 100,
  });
});

test('produces bounded scores and a deterministic high-risk verdict for weak evidence', () => {
  const result = calculateIdeaScore({
    problem: { clearlyDefined: false, frequency: 'low', severity: 'low' },
    audience: { clearlyDefined: false, accessibility: 'low' },
    market: { reach: 'small', monetizable: false },
    feasibility: {
      technicalComplexity: 'high',
      resourceRequirement: 'high',
      mvpFeasibility: 'low',
    },
    differentiation: {
      similarSolutionsKnown: true,
      hasUniqueValue: false,
      differentiationStrength: 'low',
    },
    execution: { ideaClarity: 'low', scopeClarity: 'low' },
  });

  for (const score of Object.values(result.breakdown)) {
    assert.ok(score >= 0 && score <= 100);
  }
  assert.equal(result.overallScore, 26);
  assert.equal(result.verdict, 'HIGH_RISK');
});

test('uses fixed verdict thresholds', () => {
  assert.equal(deriveVerdict(80), 'STRONG_POTENTIAL');
  assert.equal(deriveVerdict(79), 'PROMISING');
  assert.equal(deriveVerdict(65), 'PROMISING');
  assert.equal(deriveVerdict(64), 'NEEDS_REFINEMENT');
  assert.equal(deriveVerdict(45), 'NEEDS_REFINEMENT');
  assert.equal(deriveVerdict(44), 'HIGH_RISK');
});
