const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreCandidate } = require('../../services/matchScoring');

const baseRequirements = {
  domain: 'EdTech',
  availability: 'part-time',
  workPreference: 'hybrid',
  hoursPerWeek: 10,
  rolesAndSkills: [
    { role: 'Backend Developer', skills: ['Node.js', 'MongoDB'], experienceLevel: 'Intermediate', priority: 'must-have' },
    { role: 'Frontend Developer', skills: ['React'], experienceLevel: 'Beginner', priority: 'must-have' },
    { role: 'UI/UX Designer', skills: ['Figma'], experienceLevel: 'Beginner', priority: 'nice-to-have' },
  ],
};

test('scores an exact compatible candidate at 100 with explanation', () => {
  const result = scoreCandidate({
    skills: [
      { name: 'Node.js', level: 'Advanced' },
      { name: 'MongoDB', level: 'Intermediate' },
      { name: 'React', level: 'Advanced' },
      { name: 'Figma', level: 'Beginner' },
    ],
    targetRoles: ['Backend Developer', 'Frontend Developer'],
    domainInterests: ['EdTech'],
    availability: 'part-time',
    workPreference: 'hybrid',
    hoursPerWeek: 20,
  }, baseRequirements);
  assert.equal(result.score, 100);
  assert.deepEqual(result.matchedSkills, ['Node.js', 'MongoDB', 'React']);
  assert.deepEqual(result.missingSkills, []);
  assert.deepEqual(result.niceToHaveSkills, ['Figma']);
  assert.equal(result.scoringVersion, 'v1');
});

test('normalizes duplicate and case-variant skills and rounds final score', () => {
  const result = scoreCandidate({
    skills: [{ name: ' node.js ', level: 'Intermediate' }, { name: 'NODE.JS', level: 'Advanced' }],
    targetRoles: ['Backend Developer'],
    domainInterests: [],
  }, { rolesAndSkills: [{ role: 'Backend Developer', skills: ['Node.js', 'MongoDB'], experienceLevel: 'Advanced' }] });
  assert.equal(result.matchedSkills.length, 1);
  assert.deepEqual(result.missingSkills, ['MongoDB']);
  assert.equal(result.score, 72.5);
});

test('keeps nice-to-have skills explanation-only and handles no must-have skills', () => {
  const result = scoreCandidate({ skills: [{ name: 'Docker', level: 'Advanced' }] }, {
    rolesAndSkills: [{ role: 'DevOps Engineer', skills: ['Docker'], priority: 'nice-to-have', experienceLevel: 'Advanced' }],
  });
  assert.equal(result.components.skills, 40);
  assert.equal(result.niceToHaveSkills[0], 'Docker');
  assert.equal(result.availabilityFallback, true);
});

test('uses half-step level compatibility and availability fallback when requirements are absent', () => {
  const result = scoreCandidate({ skills: [{ name: 'Python', level: 'Beginner' }], domainInterests: ['AI'] }, {
    domain: 'AI',
    rolesAndSkills: [{ role: 'ML Engineer', skills: ['Python'], experienceLevel: 'Intermediate' }],
  });
  assert.equal(result.components.level, 7.5);
  assert.equal(result.components.availability, 7.5);
  assert.equal(result.availabilityFallback, true);
});

test('is deterministic and does not mutate inputs', () => {
  const candidate = { skills: [{ name: 'React', level: 'Advanced' }], targetRoles: ['Frontend Developer'] };
  const requirements = { rolesAndSkills: [{ role: 'Frontend Developer', skills: ['React'], experienceLevel: 'Advanced' }] };
  const original = JSON.stringify({ candidate, requirements });
  const first = scoreCandidate(candidate, requirements);
  const second = scoreCandidate(candidate, requirements);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify({ candidate, requirements }), original);
});
