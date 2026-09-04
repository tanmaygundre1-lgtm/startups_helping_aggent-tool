const { generateText, generateObject } = require('ai');
const { z } = require('zod');

/**
 * Vercel AI SDK initialization.
 * Supports two providers based on env config:
 *   AI_PROVIDER=google              -> uses @ai-sdk/google + GOOGLE_GENERATIVE_AI_API_KEY
 *   AI_PROVIDER=openai              -> uses @ai-sdk/openai + OPENAI_API_KEY
 *   AI_PROVIDER=anthropic           -> uses @ai-sdk/anthropic + ANTHROPIC_API_KEY
 *
 * Model names come from env (with sensible defaults) so the provider can be
 * swapped without code changes.
 */
function getProviderModel() {
  const provider = (process.env.AI_PROVIDER || 'google').toLowerCase();

  if (provider === 'google') {
    const { createGoogleGenerativeAI } = require('@ai-sdk/google');
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY;

    return createGoogleGenerativeAI({ apiKey })(process.env.AI_MODEL || 'gemini-2.5-flash');
  }

  if (provider === 'anthropic') {
    const { anthropic } = require('@ai-sdk/anthropic');

    return anthropic(
      process.env.AI_MODEL || 'claude-3-5-sonnet-20241022'
    );
  }

  if (provider === 'openai') {
    const { openai } = require('@ai-sdk/openai');

    return openai(process.env.AI_MODEL || 'gpt-4o-mini');
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

const ANALYSIS_SCHEMA = z.object({
  rolesAndSkills: z.array(
    z.object({
      role: z.string(),
      skills: z.array(z.string()),
      priority: z.enum(['must-have', 'nice-to-have']),
      count: z.number(),
      experienceLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    }),
  ),
  techStack: z.array(z.string()),
  domain: z.string(),
  teamSize: z.number(),
  keyRequirements: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

/**
 * Analyze a startup idea and return structured extraction of roles/skills.
 * Uses generateObject for reliable structured output (JSON schema).
 * Falls back to generateText + parse if provider does not support structured outputs.
 */
async function generateAnalysis({ title, description, category, domain, requiredSkills }) {
  const prompt = [
    'You are an expert startup team-builder advisor.',
    'Analyze the startup idea below and extract exactly what team roles and skills are required to build it.',
    'Be practical and specific. Return precise role names and skills.',
  ].join('\n');

  const context = [
    `Startup Title: ${title || 'Untitled'}`,
    `Description: ${description || ''}`,
    category ? `Category: ${category}` : null,
    domain ? `Domain: ${domain}` : null,
    requiredSkills && requiredSkills.length
      ? `Founder-Provided Skills: ${requiredSkills.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { object } = await generateObject({
      model: getProviderModel(),
      schema: ANALYSIS_SCHEMA,
      system: prompt,
      prompt: context,
      temperature: 0.7,
    });
    return object;
  } catch (error) {
    console.warn('[AI] generateObject failed, falling back to generateText:', error.message);
    const { text } = await generateText({
      model: getProviderModel(),
      system: prompt,
      prompt: `${context}\n\nRespond with valid JSON matching: {"rolesAndSkills":[{"role":"string","skills":["string"],"priority":"must-have|nice-to-have","count":number,"experienceLevel":"Beginner|Intermediate|Advanced"}],"techStack":["string"],"domain":"string","teamSize":number,"keyRequirements":["string"],"nextSteps":["string"]}`,
      temperature: 0.7,
      maxTokens: 1500,
    });
    return JSON.parse(text);
  }
}

module.exports = {
  generateAnalysis,
  getProviderModel,
  ANALYSIS_SCHEMA,
};