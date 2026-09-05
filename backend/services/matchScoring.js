const SCORING_VERSION = 'v1';
const WEIGHTS = Object.freeze({ skills: 0.4, level: 0.15, role: 0.15, domain: 0.15, availability: 0.15 });
const LEVELS = Object.freeze({ beginner: 1, intermediate: 2, advanced: 3 });

const normalize = (value) => String(value || '').trim().toLowerCase();
const unique = (values) => [...new Map(values.filter(Boolean).map((value) => [normalize(value), String(value).trim()])).values()];

const levelValue = (level) => LEVELS[normalize(level)] || 0;

const normalizeCandidateSkills = (candidate) => {
  const skills = Array.isArray(candidate?.skills) ? candidate.skills : [];
  const byName = new Map();
  for (const skill of skills) {
    const name = typeof skill === 'string' ? skill : skill?.name;
    const key = normalize(name);
    if (!key) continue;
    const current = byName.get(key);
    if (!current || levelValue(skill?.level) > levelValue(current.level)) {
      byName.set(key, { name: String(name).trim(), level: skill?.level || 'Beginner' });
    }
  }
  return byName;
};

const flattenRequirements = (requirements = {}) => {
  const roles = Array.isArray(requirements.rolesAndSkills) ? requirements.rolesAndSkills : [];
  const mustHave = [];
  const niceToHave = [];
  const roleRequirements = [];
  for (const role of roles) {
    const skills = unique(role.skills || []);
    roleRequirements.push({
      role: role.role,
      skills,
      experienceLevel: role.experienceLevel,
      priority: role.priority || 'must-have',
    });
    (role.priority === 'nice-to-have' ? niceToHave : mustHave).push(...skills);
  }
  return {
    roles: roleRequirements,
    mustHave: unique(mustHave),
    niceToHave: unique(niceToHave),
  };
};

const calculateLevelCompatibility = (candidateSkills, requirements) => {
  const roleRequirements = (requirements.roles || []).filter((role) => role.priority !== 'nice-to-have');
  if (!roleRequirements.length) return 1;
  const scores = roleRequirements.map((role) => {
    const required = levelValue(role.experienceLevel);
    if (!required) return 1;
    const relevant = role.skills.map((skill) => candidateSkills.get(normalize(skill))).filter(Boolean);
    if (!relevant.length) return 0;
    const best = Math.max(...relevant.map((skill) => levelValue(skill.level)));
    if (best >= required) return 1;
    if (best === required - 1) return 0.5;
    return 0;
  });
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
};

const calculateAvailabilityCompatibility = (candidate, requirements) => {
  const hasRequirement = requirements.availability || requirements.workPreference || requirements.hoursPerWeek;
  if (!hasRequirement) return 0.5;
  const availabilityMatch = !requirements.availability || normalize(candidate.availability) === normalize(requirements.availability);
  const workModeMatch = !requirements.workPreference || normalize(candidate.workPreference) === normalize(requirements.workPreference);
  const hoursMatch = !requirements.hoursPerWeek || Number(candidate.hoursPerWeek || 0) >= Number(requirements.hoursPerWeek);
  if (availabilityMatch && workModeMatch && hoursMatch) return 1;
  if (availabilityMatch || workModeMatch || hoursMatch) return 0.5;
  return 0;
};

function scoreCandidate(candidate = {}, requirements = {}) {
  const flattened = flattenRequirements(requirements);
  const candidateSkills = normalizeCandidateSkills(candidate);
  const candidateSkillKeys = new Set(candidateSkills.keys());
  const mustHaveKeys = flattened.mustHave.map(normalize);
  const niceToHaveKeys = flattened.niceToHave.map(normalize);
  const matchedSkills = flattened.mustHave.filter((skill) => candidateSkillKeys.has(normalize(skill)));
  const missingSkills = flattened.mustHave.filter((skill) => !candidateSkillKeys.has(normalize(skill)));
  const niceToHaveSkills = flattened.niceToHave.filter((skill) => candidateSkillKeys.has(normalize(skill)));
  const skillsMatchScore = mustHaveKeys.length ? (matchedSkills.length / mustHaveKeys.length) * 100 : 100;
  const levelCompatibility = calculateLevelCompatibility(candidateSkills, flattened);
  const requiredRoles = flattened.roles
    .filter((role) => role.priority !== 'nice-to-have')
    .map((role) => role.role)
    .filter(Boolean);
  const roleMatches = unique(requiredRoles.filter((role) => (candidate.targetRoles || []).some((target) => normalize(target) === normalize(role))));
  const roleMatch = requiredRoles.length ? roleMatches.length / unique(requiredRoles).length : 1;
  const ideaDomains = unique([requirements.domain, requirements.ideaDomain, ...(requirements.domainInterests || [])]);
  const candidateDomains = new Set((candidate.domainInterests || []).map(normalize));
  const sharedDomains = ideaDomains.filter((domain) => candidateDomains.has(normalize(domain)));
  const domainMatch = ideaDomains.length ? (sharedDomains.length ? 1 : 0) : 1;
  const availabilityCompatibility = calculateAvailabilityCompatibility(candidate, requirements);
  const components = {
    skills: skillsMatchScore * WEIGHTS.skills,
    level: levelCompatibility * 100 * WEIGHTS.level,
    role: roleMatch * 100 * WEIGHTS.role,
    domain: domainMatch * 100 * WEIGHTS.domain,
    availability: availabilityCompatibility * 100 * WEIGHTS.availability,
  };
  const score = Math.round((components.skills + components.level + components.role + components.domain + components.availability) * 100) / 100;
  return {
    score,
    matchedSkills,
    missingSkills,
    niceToHaveSkills,
    sharedDomains,
    roleMatches,
    components,
    scoringVersion: SCORING_VERSION,
    availabilityFallback: !requirements.availability && !requirements.workPreference && !requirements.hoursPerWeek,
  };
}

module.exports = { scoreCandidate, normalize, flattenRequirements, SCORING_VERSION, WEIGHTS };
