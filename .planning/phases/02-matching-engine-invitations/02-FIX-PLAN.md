---
phase: 02-matching-engine-invitations
plan: fix
type: execute
gap_closure: true
files_modified:
  - backend/services/matchScoring.js
  - backend/controllers/matchingController.js
  - backend/test/unit/matchScoring.test.js
  - backend/test/integration/matching.integration.test.js
autonomous: true
requirements: [F4.1, F4.2, F4.3]
---

<objective>
Fix candidate match scoring calculation gaps and dynamic match snapshot retrieval.

Purpose: Ensure candidates are accurately scored across skills, roles, and domains even with top-level idea requirements or token variations, and enable dynamic match snapshot generation when GET /api/candidates/matches/:ideaId is called before founder search.
Output: Flexible scoring service, fallback requirement handling, dynamic candidate match calculation, and updated test suite.
</objective>

<tasks>
<task type="auto">
  <name>Task 1: Extend match scoring service with top-level fallbacks and token matching</name>
  <files>backend/services/matchScoring.js, backend/test/unit/matchScoring.test.js</files>
  <action>
    Update `flattenRequirements` in `matchScoring.js`:
    1. If `requirements.rolesAndSkills` is empty or absent, populate `mustHave` from `requirements.requiredSkills` and `roles` from `requirements.requiredRoles`.
    2. Enhance domain matching: split domain strings by spaces/slashes/delimiters into tokens so 'EdTech' matches 'EdTech', 'AI', or 'EdTech/AI'.
    3. Enhance role matching: allow flexible matching between candidate `targetRoles` and idea roles (e.g., 'Full Stack Developer' or 'Backend Developer' matching 'Backend Developer').
    4. If no skills are required, default skills component score to 100 (neutral).
    5. Update unit tests in `matchScoring.test.js` to verify top-level skill/role fallbacks and flexible domain/role matching.
  </action>
  <verify><automated>node --test backend/test/unit/matchScoring.test.js</automated></verify>
  <done>Scoring service accurately matches candidate skills, domains, and roles using top-level fallbacks and flexible token matching.</done>
</task>

<task type="auto">
  <name>Task 2: Implement dynamic on-the-fly candidate match lookup in matchingController</name>
  <files>backend/controllers/matchingController.js, backend/test/integration/matching.integration.test.js</files>
  <action>
    In `getCandidateMatch`:
    1. If `Match.findOne({ ideaId, userId: user._id })` returns null, retrieve the idea and candidate profile.
    2. Compute candidate match score dynamically using `scoreCandidate`.
    3. Upsert the calculated `Match` snapshot into MongoDB on-the-fly and return the newly generated match snapshot.
    4. Allow candidate match retrieval even if founder search has not been executed yet.
    5. Update `searchMatches` and `getCandidateMatch` to pass top-level `requiredSkills` and `requiredRoles` into `scoreCandidate`.
  </action>
  <verify><automated>node --test backend/test/integration/matching.integration.test.js</automated></verify>
  <done>GET /api/candidates/matches/:ideaId dynamically calculates and upserts match snapshot if not already present.</done>
</task>
</tasks>
