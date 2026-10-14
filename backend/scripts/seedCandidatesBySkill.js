const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const connectToDatabase = require('../config/db');
const User = require('../models/User');

const SKILL_GROUPS = [
  ['Shopify', 'Conversion Rate Optimization|Marketing|Customer Acquisition', 'E-commerce Specialist', 'E-commerce', 'commerce'],
  ['Conversion Rate Optimization', 'Shopify|Performance Marketing|Customer Acquisition', 'Growth Marketer', 'Digital Marketing', 'marketing'],
  ['Inventory Management', 'Sourcing|Warehousing|Pan-India Logistics', 'Operations Manager', 'Supply Chain', 'operations management'],
  ['Paid Social Ads', 'Performance Marketing|Marketing|Customer Acquisition', 'Performance Marketer', 'Digital Marketing', 'marketing'],
  ['Influencer Marketing', 'Content Creation|Marketing|Customer Acquisition', 'Influencer Marketing Specialist', 'Marketing', 'marketing'],
  ['Content Creation', 'Influencer Marketing|Marketing|Paid Social Ads', 'Content Creator', 'Marketing', 'media and communications'],
  ['Fashion Design', 'Tech Packs|Sourcing|Vendor Negotiation', 'Fashion Designer', 'Fashion', 'fashion design'],
  ['Sourcing', 'Vendor Negotiation|Inventory Management|Fashion Design', 'Supply Chain Specialist', 'Supply Chain', 'supply chain management'],
  ['Tech Packs', 'Fashion Design|Sourcing|Vendor Negotiation', 'Fashion Designer', 'Fashion', 'fashion technology'],
  ['Vendor Negotiation', 'Sourcing|B2B Negotiation|Inventory Management', 'Business Development Associate', 'Business Development', 'business administration'],
  ['Pan-India Logistics', 'Warehousing|Inventory Management|FMCG Distribution', 'Supply Chain Specialist', 'Logistics', 'logistics management'],
  ['Warehousing', 'Inventory Management|Pan-India Logistics|FMCG Distribution', 'Operations Manager', 'Logistics', 'operations management'],
  ['Retail Partnerships', 'B2B Negotiation|Key Account Management|FMCG Distribution', 'Business Development Associate', 'Retail', 'business administration'],
  ['B2B Negotiation', 'Retail Partnerships|Vendor Negotiation|Key Account Management', 'Sales Specialist', 'Sales', 'business administration'],
  ['FMCG Distribution', 'Key Account Management|Inventory Management|Pan-India Logistics', 'FMCG Distribution Specialist', 'FMCG', 'commerce'],
  ['Key Account Management', 'Retail Partnerships|FMCG Distribution|B2B Negotiation', 'Customer Success Associate', 'Sales', 'business administration'],
  ['Marketing', 'Performance Marketing|Content Creation|Customer Acquisition', 'Marketing Specialist', 'Marketing', 'marketing'],
  ['Performance Marketing', 'Paid Social Ads|Conversion Rate Optimization|Customer Acquisition', 'Performance Marketer', 'Digital Marketing', 'marketing'],
  ['Shopify/Magento', 'Shopify|Conversion Rate Optimization|Inventory Management', 'E-commerce Specialist', 'E-commerce', 'commerce'],
  ['Customer Acquisition', 'Marketing|Performance Marketing|Paid Social Ads', 'Growth Marketer', 'Marketing', 'marketing'],
  ['Menu Design', 'Recipe Standardization|Food Safety & Hygiene|Packaging Optimization', 'Restaurant Operations Specialist', 'Food & Beverage', 'hospitality management'],
  ['Food Safety & Hygiene', 'Recipe Standardization|Batch Cooking|Packaging Optimization', 'Food Operations Specialist', 'Food & Beverage', 'food technology'],
  ['Recipe Standardization', 'Batch Cooking|Food Safety & Hygiene|Menu Design', 'Food Operations Specialist', 'Food & Beverage', 'culinary arts'],
  ['Batch Cooking', 'Recipe Standardization|Food Safety & Hygiene|Packaging Optimization', 'Food Operations Specialist', 'Food & Beverage', 'food technology'],
  ['Swiggy/Zomato Partner Dashboard Management', 'Customer Service|Menu Design|Food Safety & Hygiene', 'Restaurant Operations Specialist', 'Restaurant', 'hospitality management'],
  ['Packaging Optimization', 'Inventory Management|Food Safety & Hygiene|FMCG Distribution', 'Operations Manager', 'Operations', 'operations management'],
  ['Customer Service', 'Swiggy/Zomato Partner Dashboard Management|Key Account Management|Customer Acquisition', 'Customer Success Associate', 'Restaurant', 'business administration'],
];

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Kabir',
  'Meera', 'Nikhil', 'Nisha', 'Omkar', 'Priya', 'Rahul', 'Riya', 'Saanvi', 'Sahil',
  'Tanvi', 'Vedant', 'Yash', 'Zoya', 'Aditya', 'Madhavi', 'Neel', 'Pooja', 'Rohan',
];
const LAST_NAMES = ['Mehta', 'Kulkarni', 'Rao', 'Shah', 'Iyer'];
const COLLEGES = [
  ['Indian Institute of Technology Bombay', 'iit-bombay', 'Mumbai', 'Maharashtra', 'West India'],
  ['Narsee Monjee Institute of Management Studies', 'nmims-mumbai', 'Mumbai', 'Maharashtra', 'West India'],
  ['Savitribai Phule Pune University', 'sppu-pune', 'Pune', 'Maharashtra', 'West India'],
  ['COEP Technological University', 'coep-pune', 'Pune', 'Maharashtra', 'West India'],
  ['Indian Institute of Technology Madras', 'iit-madras', 'Chennai', 'Tamil Nadu', 'South India'],
  ['Anna University', 'anna-university', 'Chennai', 'Tamil Nadu', 'South India'],
  ['Christ University', 'christ-bengaluru', 'Bengaluru', 'Karnataka', 'South India'],
  ['Indian Institute of Science', 'iisc-bengaluru', 'Bengaluru', 'Karnataka', 'South India'],
  ['University of Delhi', 'du-delhi', 'New Delhi', 'Delhi', 'North India'],
  ['Indian Institute of Technology Delhi', 'iit-delhi', 'New Delhi', 'Delhi', 'North India'],
  ['Jamia Millia Islamia', 'jmi-delhi', 'New Delhi', 'Delhi', 'North India'],
  ['University of Hyderabad', 'uoh-hyderabad', 'Hyderabad', 'Telangana', 'South India'],
  ['Osmania University', 'osmania-hyderabad', 'Hyderabad', 'Telangana', 'South India'],
  ['Indian Institute of Management Ahmedabad', 'iima-ahmedabad', 'Ahmedabad', 'Gujarat', 'West India'],
  ['Gujarat University', 'gu-ahmedabad', 'Ahmedabad', 'Gujarat', 'West India'],
  ['University of Rajasthan', 'uniraj-jaipur', 'Jaipur', 'Rajasthan', 'North India'],
  ['Malaviya National Institute of Technology Jaipur', 'mnit-jaipur', 'Jaipur', 'Rajasthan', 'North India'],
  ['Devi Ahilya Vishwavidyalaya', 'davv-indore', 'Indore', 'Madhya Pradesh', 'Central India'],
  ['Indian Institute of Management Indore', 'iimi-indore', 'Indore', 'Madhya Pradesh', 'Central India'],
  ['Rashtrasant Tukadoji Maharaj Nagpur University', 'rtmnu-nagpur', 'Nagpur', 'Maharashtra', 'Central India'],
  ['Visvesvaraya National Institute of Technology', 'vnit-nagpur', 'Nagpur', 'Maharashtra', 'Central India'],
  ['Sardar Vallabhbhai National Institute of Technology', 'svnit-surat', 'Surat', 'Gujarat', 'West India'],
  ['University of Calcutta', 'calcutta-university', 'Kolkata', 'West Bengal', 'East India'],
  ['Jadavpur University', 'jadavpur-kolkata', 'Kolkata', 'West Bengal', 'East India'],
  ['National Institute of Technology Tiruchirappalli', 'nit-trichy', 'Tiruchirappalli', 'Tamil Nadu', 'South India'],
  ['Symbiosis International University', 'siu-pune', 'Pune', 'Maharashtra', 'West India'],
  ['Institute of Chemical Technology', 'ict-mumbai', 'Mumbai', 'Maharashtra', 'West India'],
];
const LEVELS = ['Beginner', 'Beginner', 'Beginner', 'Intermediate', 'Intermediate', 'Intermediate', 'Intermediate', 'Intermediate', 'Advanced', 'Advanced'];
const AVAILABILITY = ['part-time', 'flexible', 'full-time'];
const WORK_PREFERENCE = ['remote', 'hybrid', 'in-person'];
const INTERESTS = {
  'E-commerce': ['D2C Brands', 'Online Retail'],
  'Digital Marketing': ['E-commerce', 'Social Media'],
  'Supply Chain': ['Retail', 'Operations'],
  'Business Development': ['Sales', 'Entrepreneurship'],
  'Food & Beverage': ['Food', 'Restaurant Operations'],
  Marketing: ['D2C Brands', 'Content Creation'],
  Fashion: ['Apparel', 'Sustainable Fashion'],
  Logistics: ['Operations', 'Retail'],
  Retail: ['Sales', 'Entrepreneurship'],
  Sales: ['Retail', 'Business Development'],
  FMCG: ['Retail', 'Sales'],
  Restaurant: ['Food', 'Customer Experience'],
  Operations: ['D2C Brands', 'Sustainable Packaging'],
  'Supply Chain': ['Retail', 'Operations'],
  Marketing: ['D2C Brands', 'Content Creation'],
  Fashion: ['Apparel', 'Sustainable Fashion'],
  'Business Development': ['Sales', 'Entrepreneurship'],
  Logistics: ['Operations', 'Retail'],
  Retail: ['Sales', 'Entrepreneurship'],
  Sales: ['Retail', 'Business Development'],
  FMCG: ['Retail', 'Sales'],
  'Food & Beverage': ['Food', 'Restaurant Operations'],
  Restaurant: ['Food', 'Customer Experience'],
  Operations: ['D2C Brands', 'Sustainable Packaging'],
};

const createCandidates = () => {
  let levelIndex = 0;

  return SKILL_GROUPS.flatMap(([primarySkill, relatedSkills, role, domain, field], groupIndex) => {
    const related = relatedSkills.split('|');

    return LAST_NAMES.map((lastName, variantIndex) => {
      const userIndex = groupIndex * LAST_NAMES.length + variantIndex;
      const college = COLLEGES[userIndex % COLLEGES.length];
      const firstName = FIRST_NAMES[groupIndex];
      const name = `${firstName} ${lastName}`;
      const relatedSelections = [[0, 1], [0], [1], [1, 2], [2]];
      const skillNames = [primarySkill, ...relatedSelections[variantIndex].map((index) => related[index])];

      const skills = skillNames.map((skillName) => ({
        name: skillName,
        level: LEVELS[levelIndex++ % LEVELS.length],
      }));
      const year = (userIndex % 4) + 1;
      const suffix = ['st', 'nd', 'rd', 'th'][year - 1];
      const interests = [domain, ...(INTERESTS[domain] || ['Startups', 'Entrepreneurship'])]
        .slice(0, 2 + (variantIndex % 3));
      const sequence = String(userIndex + 1).padStart(3, '0');

      return {
        firebaseUid: `seed_candidate_${sequence}`,
        name,
        email: `student${sequence}@seed.startuplink.test`,
        profileType: 'candidate',
        college: { name: college[0], collegeId: college[1] },
        location: { city: college[2], state: college[3], region: college[4] },
        skills,
        interests,
        bio: `${name} is a ${year}${suffix}-year ${field} student building experience in ${primarySkill.toLowerCase()}. Interested in collaborating on ${domain} startup projects.`,
        targetRoles: [role],
        experience: [0, 1, 1, 2, 3][variantIndex],
        qualifications: [`${primarySkill} student project`, `${domain} club participant`],
        domainInterests: [domain],
        availability: AVAILABILITY[userIndex % AVAILABILITY.length],
        hoursPerWeek: [8, 12, 16, 20, 24, 28, 32][userIndex % 7],
        workPreference: WORK_PREFERENCE[Math.floor(userIndex / 3) % WORK_PREFERENCE.length],
        profileCompleted: true,
      };
    });
  });
};

const duplicates = (values) => {
  const seen = new Set();
  const found = new Set();
  for (const value of values) {
    if (seen.has(value)) found.add(value);
    seen.add(value);
  }
  return [...found];
};

const validateCandidates = (candidates) => {
  const skillCounts = Object.fromEntries(SKILL_GROUPS.map(([name]) => [name, 0]));
  for (const candidate of candidates) {
    for (const name of new Set(candidate.skills.map(({ name }) => name))) {
      if (Object.hasOwn(skillCounts, name)) skillCounts[name] += 1;
    }
  }

  const duplicateEmails = duplicates(candidates.map(({ email }) => email));
  const duplicateUids = duplicates(candidates.map(({ firebaseUid }) => firebaseUid));
  const undercovered = Object.entries(skillCounts).filter(([, count]) => count < 5);

  console.log('========================================');
  console.log('STARTUPLINK SEED DATA VALIDATION');
  console.log('========================================');
  console.log(`\nTotal users: ${candidates.length}\n`);
  for (const [skill, count] of Object.entries(skillCounts)) console.log(`${skill}: ${count}`);
  console.log(`\nDuplicate emails: ${duplicateEmails.length ? duplicateEmails.join(', ') : 'none'}`);
  console.log(`Duplicate Firebase UIDs: ${duplicateUids.length ? duplicateUids.join(', ') : 'none'}`);

  if (undercovered.length || duplicateEmails.length || duplicateUids.length) {
    const problems = [
      ...undercovered.map(([skill, count]) => `${skill} has only ${count} users`),
      ...(duplicateEmails.length ? [`duplicate emails: ${duplicateEmails.join(', ')}`] : []),
      ...(duplicateUids.length ? [`duplicate Firebase UIDs: ${duplicateUids.join(', ')}`] : []),
    ];
    throw new Error(`Seed data validation failed: ${problems.join('; ')}`);
  }

  console.log('\n========================================');
  console.log('All required skills have >= 5 users');
  console.log('No duplicate emails');
  console.log('No duplicate Firebase UIDs');
  console.log('Validation PASSED');
  console.log('========================================\n');
};

const seedCandidates = async () => {
  const candidates = createCandidates();
  validateCandidates(candidates);

  if (process.argv.includes('--validate-only')) {
    console.log('Validation-only mode; MongoDB was not modified.');
    return;
  }

  await connectToDatabase();
  try {
    const operations = candidates.map((candidate) => ({
      updateOne: {
        filter: { firebaseUid: candidate.firebaseUid },
        update: { $set: candidate },
        upsert: true,
      },
    }));
    const result = await User.bulkWrite(operations, { ordered: false });
    console.log(`Candidate seed complete: ${candidates.length} profiles processed.`);
    console.log(`Inserted: ${result.upsertedCount}; updated: ${result.modifiedCount}.`);
  } finally {
    await mongoose.connection.close();
  }
};

seedCandidates().catch(async (error) => {
  console.error('Candidate seed failed:', error.message);
  try {
    await mongoose.connection.close();
  } catch {
    // The connection may not have been opened yet.
  }
  process.exitCode = 1;
});