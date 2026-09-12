const SKILLS = [
  'React',
  'Node.js',
  'Python',
  'JavaScript',
  'TypeScript',
  'MongoDB',
  'PostgreSQL',
  'Firebase',
  'UI/UX Design',
  'Figma',
  'Machine Learning',
  'Data Science',
  'REST API',
  'Express',
  'TailwindCSS',
  'Docker',
  'AWS',
  'Product Management',
  'Marketing',
  'Business Development',
];

const SKILL_ALIASES = {
  reactjs: 'React',
  'react.js': 'React',
  'react js': 'React',
  react: 'React',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  'node js': 'Node.js',
  node: 'Node.js',
  python: 'Python',
  'python 3': 'Python',
  python3: 'Python',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  psql: 'PostgreSQL',
  firebase: 'Firebase',
  'ui/ux design': 'UI/UX Design',
  'ui/ux': 'UI/UX Design',
  'ui design': 'UI/UX Design',
  'ux design': 'UI/UX Design',
  uiux: 'UI/UX Design',
  figma: 'Figma',
  'machine learning': 'Machine Learning',
  ml: 'Machine Learning',
  'data science': 'Data Science',
  ds: 'Data Science',
  'rest api': 'REST API',
  rest: 'REST API',
  'restful api': 'REST API',
  restapi: 'REST API',
  express: 'Express',
  'express.js': 'Express',
  expressjs: 'Express',
  tailwindcss: 'TailwindCSS',
  'tailwind css': 'TailwindCSS',
  tailwind: 'TailwindCSS',
  docker: 'Docker',
  containerization: 'Docker',
  aws: 'AWS',
  'amazon web services': 'AWS',
  'product management': 'Product Management',
  product: 'Product Management',
  'product manager': 'Product Management',
  marketing: 'Marketing',
  'digital marketing': 'Marketing',
  'growth marketing': 'Marketing',
  'business development': 'Business Development',
  bizdev: 'Business Development',
  'biz dev': 'Business Development',
};

const normalizeSkill = (rawSkill) => {
  if (!rawSkill || typeof rawSkill !== 'string') return '';
  const cleaned = rawSkill.trim();
  const lower = cleaned.toLowerCase();

  if (SKILL_ALIASES[lower]) {
    return SKILL_ALIASES[lower];
  }

  const exactMatch = SKILLS.find((s) => s.toLowerCase() === lower);
  if (exactMatch) {
    return exactMatch;
  }

  return cleaned;
};

const normalizeSkills = (skillsList) => {
  if (!Array.isArray(skillsList)) return [];
  const seen = new Set();
  const normalized = [];

  for (const item of skillsList) {
    const name = typeof item === 'string' ? item : item?.name;
    const clean = normalizeSkill(name);
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      if (typeof item === 'object' && item !== null && item.level) {
        normalized.push({ name: clean, level: item.level });
      } else {
        normalized.push(clean);
      }
    }
  }

  return normalized;
};

const DOMAINS = [
  'EdTech',
  'FinTech',
  'HealthTech',
  'AI',
  'E-commerce',
  'Social',
  'Climate',
  'SaaS',
  'Marketplace',
  'Other',
];

const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI/UX Designer',
  'Product Manager',
  'Data Scientist',
  'ML Engineer',
  'DevOps Engineer',
  'Marketing Lead',
  'Business Development',
];

module.exports = { SKILLS, DOMAINS, ROLES, SKILL_ALIASES, normalizeSkill, normalizeSkills };
