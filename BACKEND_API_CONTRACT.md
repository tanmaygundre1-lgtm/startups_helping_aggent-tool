# StartupLink Backend API Contract

This document is based on the live backend implementation in the source tree. It is the contract definition for the current app and is the source of truth for frontend integration.

## 1) Authentication contract

All protected endpoints require:

- Header: `Authorization: Bearer <Firebase_ID_Token>`
- Middleware: `backend/middleware/authMiddleware.js`
- Behavior: verifies the Firebase ID token with `firebase-admin/auth`. Missing, empty, or invalid tokens return `401`.

Common unauthenticated response:

```json
{
  "message": "Authentication required"
}
```

Common invalid-token response:

```json
{
  "message": "Invalid or expired authentication token"
}
```

## 2) Response envelope conventions

The backend consistently uses either:

- `success: true` with payload data for successful operations
- `success: false` with `message` for failed operations
- error objects may also include `code` for specific cases

Typical success payload:

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "_id": "66d9...",
    "firebaseUid": "abc123",
    "name": "Jane",
    "profileType": "founder"
  }
}
```

Typical failure payload:

```json
{
  "success": false,
  "message": "Profile not found"
}
```

## 3) Core status codes

- `200 OK` — successful read/update/idempotent transition
- `201 Created` — created resource
- `400 Bad Request` — malformed request, invalid ID, bad input shape
- `401 Unauthorized` — missing or bad Firebase token
- `403 Forbidden` — authenticated user is not owner/authorized
- `404 Not Found` — resource missing
- `409 Conflict` — duplicate or stale state, such as existing profile or pending invitation
- `500 Internal Server Error` — unexpected server-side failure

## 4) User APIs

### POST /api/users/sync

Purpose: create or refresh the MongoDB user record from Firebase login.

Request body fields:

```json
{
  "name": "Optional display name string",
  "profileImage": "Optional profile-image URL string"
}
```

Validation rules:

- Authorization token is mandatory.
- `name` and `profileImage` are optional strings; they are used as overrides if present.
- If user does not exist, backend creates a base user with:
  - `firebaseUid`
  - `email`
  - `name` = requested name OR Firebase name OR email OR UID
  - `profileImage` = requested profileImage OR Firebase photo
  - `college: { name: '' }`
  - `location: { city: '', state: '', region: '' }`
  - `skills: []`
  - `interests: []`
  - `profileCompleted: false`

Success response:

```json
{
  "success": true,
  "message": "User synchronized successfully",
  "user": {
    "_id": "ObjectId",
    "firebaseUid": "firebase-uid",
    "email": "user@example.com",
    "name": "Jane",
    "profileImage": "https://...",
    "college": { "name": "" },
    "location": { "city": "", "state": "", "region": "" },
    "skills": [],
    "interests": [],
    "profileCompleted": false,
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```

Failure status codes:

- `401` missing/invalid Firebase token
- `409` duplicate user / unique key conflict
- `500` MongoDB or server failure

### POST /api/users/profile

Purpose: create founder profile. This is the real founder creation endpoint.

Exact request body:

```json
{
  "profileType": "founder",
  "companyStage": "idea",
  "expertiseAreas": ["Product", "AI"],
  "lookingFor": ["Frontend engineer", "Growth lead"],
  "yearsExperience": 4,
  "bio": "I am building an AI startup around developer workflows."
}
```

Validation rules:

- `profileType` must be exactly `"founder"`
- If the current Firebase UID already exists in Mongo, return `409 PROFILE_EXISTS`
- `companyStage` is optional and may be `"idea"`, `"early"`, `"growth"`, or `""`
- `expertiseAreas` and `lookingFor` are arrays of strings
- `yearsExperience` is optional number
- `bio` is optional string

Success response:

```json
{
  "userId": "ObjectId",
  "profileType": "founder",
  "companyStage": "idea",
  "message": "Profile created"
}
```

Failure status codes:

- `400` invalid `profileType`
- `409` profile already exists
- `500` create failure

### POST /api/users/candidate-profile

Purpose: create candidate profile.

Exact request body shaped for the actual controller:

```json
{
  "targetRoles": ["Frontend Engineer", "Product Manager"],
  "skills": ["React", "Node.js", "Product Design"],
  "availability": "full-time",
  "location": {
    "city": "Boston",
    "state": "MA",
    "region": "US"
  },
  "experience": 3,
  "qualifications": ["BSc CS", "AWS Certified"]
}
```

Important note:

- The controller checks only that `skills` and `targetRoles` are arrays.
- The schema expects `skills` to be an array of objects like `{ name, level }`, so the safe production shape is:

```json
{
  "targetRoles": ["Frontend Engineer"],
  "skills": [
    { "name": "React", "level": "Advanced" },
    { "name": "Node.js", "level": "Intermediate" }
  ],
  "availability": "full-time",
  "location": {
    "city": "Boston",
    "state": "MA",
    "region": "US"
  },
  "experience": 3,
  "qualifications": ["BSc CS"]
}
```

Validation rules:

- `skills` and `targetRoles` must be arrays
- `profileType` is not supplied here; backend sets `profileType: "candidate"`
- If the current user already exists, return `409 PROFILE_EXISTS`

Success response:

```json
{
  "userId": "ObjectId",
  "profileType": "candidate",
  "message": "Candidate profile created"
}
```

### GET /api/users/profile

Purpose: fetch the current authenticated user full profile.

Success response:

```json
{
  "success": true,
  "user": {
    "_id": "ObjectId",
    "firebaseUid": "...",
    "email": "...",
    "name": "...",
    "profileType": "founder | candidate",
    "profileCompleted": true,
    "skills": [],
    "interests": [],
    "bio": "...",
    "targetRoles": [],
    "domainInterests": [],
    "availability": "full-time",
    "hoursPerWeek": 20,
    "workPreference": "remote"
  }
}
```

Failure statuses:

- `404` if no profile exists
- `500` DB failure

### PUT /api/users/profile

Purpose: update the current user profile.

Allowed body fields:

```json
{
  "name": "string",
  "profileType": "founder | candidate",
  "college": { "name": "string", "collegeId": "string" },
  "location": { "city": "string", "state": "string", "region": "string" },
  "skills": [
    { "name": "string", "level": "Beginner | Intermediate | Advanced" }
  ],
  "interests": ["string"],
  "bio": "string",
  "expertiseAreas": ["string"],
  "lookingFor": ["string"],
  "targetRoles": ["string"],
  "domainInterests": ["string"],
  "availability": "full-time | part-time | flexible",
  "hoursPerWeek": 20,
  "workPreference": "remote | in-person | hybrid"
}
```

Validation rules:

- `profileType` must be `founder` or `candidate`
- `skills` must be an array of `{ name, level }` entries
- `level` must be one of `Beginner`, `Intermediate`, `Advanced`
- `hoursPerWeek` must be a number between `0` and `80`
- `availability` must be one of `full-time`, `part-time`, `flexible`, or empty string
- `workPreference` must be one of `remote`, `in-person`, `hybrid`, or empty string
- `profileCompleted` becomes `true` only when:
  - `user.name` exists
  - `user.profileType` exists
  - founder: `bio` exists
  - candidate: `skills.length > 0`

Success response:

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { "_id": "..." }
}
```

### GET /api/users/profile/:userId

Purpose: return public profile for a user ID.

Response:

```json
{
  "success": true,
  "user": {
    "_id": "ObjectId",
    "name": "Jane",
    "profileImage": "https://...",
    "profileType": "candidate",
    "college": { "name": "" },
    "location": { "city": "", "state": "", "region": "" },
    "skills": [],
    "interests": [],
    "targetRoles": [],
    "domainInterests": [],
    "availability": "full-time",
    "workPreference": "remote"
  }
}
```

Failure statuses:

- `400` invalid `userId` format
- `404` user not found
- `500` DB failure

### POST /api/users/candidates/search

Purpose: search candidates by role/skill/domain/work preference.

Request body fields:

```json
{
  "skills": ["React", "Node.js"],
  "targetRoles": ["Frontend Engineer"],
  "domainInterests": ["Fintech"],
  "workPreference": "remote",
  "availability": "full-time",
  "limit": 20,
  "skip": 0
}
```

Validation rules:

- Query only considers `profileType: "candidate"` and `profileCompleted: true`
- `limit` is clamped to `1..50`
- `skip` is non-negative
- Empty values are ignored

Success response:

```json
{
  "success": true,
  "candidates": [
    {
      "_id": "ObjectId",
      "name": "Jane",
      "profileImage": "...",
      "college": { "name": "" },
      "location": { "city": "", "state": "", "region": "" },
      "skills": [{ "name": "React", "level": "Advanced" }],
      "targetRoles": ["Frontend Engineer"],
      "domainInterests": ["Fintech"],
      "availability": "full-time",
      "workPreference": "remote",
      "hoursPerWeek": 20
    }
  ],
  "total": 1,
  "limit": 20,
  "skip": 0
}
```

## 5) Idea APIs

/_
`GET /api/ideas/discover` — Browse ideas for candidates.
`POST /api/ideas/` — Create idea.
`GET /api/ideas/` — List my ideas.
`GET /api/ideas/:ideaId` — Get idea.
`PUT /api/ideas/:ideaId` — Update idea.
`DELETE /api/ideas/:ideaId` — Delete idea.
_/

### GET /api/ideas/discover

Purpose: Allows candidates to browse all startup ideas that have achieved `approved` status from the AI analysis pipeline.

### POST /api/ideas/

Purpose: Enables a founder to create a new startup idea document. The backend automatically assigns the authenticated user as the creator.

### GET /api/ideas/

Purpose: Fetches a list of startup ideas created by the currently authenticated founder.

### GET /api/ideas/:ideaId

Purpose: Retrieves the full details of a specific startup idea by its unique identifier.

### PUT /api/ideas/:ideaId

Purpose: Allows the owner of an idea to update its details like title, description, skills, etc.

### DELETE /api/ideas/:ideaId

Purpose: Allows the owner to delete an idea provided it has not yet received an approved AI analysis.

Validation rules:

- `title` required, minimum 3 characters
- `description` required, minimum 20 characters
- `requiredSkills` may be array or omitted
- Backend sets `status: "draft"`

Success response:

```json
{
  "success": true,
  "message": "Idea created successfully",
  "idea": {
    "_id": "ObjectId",
    "createdBy": "ObjectId",
    "title": "AI founder matching app",
    "description": "...",
    "status": "draft"
  }
}
```

Status codes:

- `201` created
- `400` invalid title/description
- `404` user not found
- `500` server failure

### GET /api/ideas/discover

Protected candidate-facing idea discovery endpoint.

Query params: `domain`, `category`, `limit`, `skip`

Only returns ideas with:

- `status` in `['analyzed', 'matching', 'team-forming']`
- `aiAnalysis.isApproved === true`

Success response:

```json
{
  "success": true,
  "ideas": [
    {
      "_id": "ObjectId",
      "title": "...",
      "description": "...",
      "category": "...",
      "domain": "...",
      "status": "matching",
      "aiAnalysis": {
        "rolesAndSkills": [],
        "teamSize": 3
      },
      "createdAt": "ISO date"
    }
  ],
  "total": 1
}
```

### PUT /api/ideas/:ideaId

Allowed updates:

- `title`
- `description`
- `category`
- `domain`
- `problemStatement`
- `targetUsers`
- `requiredSkills`

Validation rules:

- Only the idea owner can update
- `403` if user is not owner
- Title must be at least 3 chars if changed
- Description must be at least 20 chars if changed

### DELETE /api/ideas/:ideaId

Validation rules:

- Only the idea owner can delete
- `400` if idea has an approved analysis
- `403` if not owner

## 6.1) Enhanced Idea and Deterministic Analysis APIs

### Method
`POST`

### Route
`/api/ideas/:ideaId/enhance`

### Purpose
Uses the configured Vercel AI SDK provider to transform the stored founder idea into a clearer, structured concept. It improves clarity, problem framing, solution explanation, audience, value proposition, and core workflow. It does **not** score, validate the market, or claim absolute novelty.

### Authentication
Firebase Bearer token required.

### Authorization
Only the owner of `ideaId` may enhance the idea.

### Request Body
Optional overrides; omitted fields use the stored raw idea:

```json
{
  "title": "Optional raw title, 3-200 characters",
  "description": "Optional raw description, 20-4000 characters"
}
```

### Query Parameters
None.

### Validation
- `ideaId` must be a valid Mongo ObjectId.
- Optional `title` must be a string from 3 to 200 characters.
- Optional `description` must be a string from 20 to 4000 characters.
- Founder text is delimited and treated as data, not model instructions.

### Success Response
`200 OK`

```json
{
  "success": true,
  "enhancedIdea": {
    "title": "Refined concept title",
    "description": "Refined description",
    "problem": "Problem statement",
    "solution": "Solution explanation",
    "targetAudience": "Primary audience",
    "valueProposition": "Why it is useful",
    "coreWorkflow": "Primary workflow",
    "updatedAt": "ISO-8601 date"
  }
}
```

### Error Responses
- `400` invalid object ID or input length
- `401` missing/invalid Firebase token
- `403` authenticated user does not own the idea
- `404` user or idea not found
- `502` AI provider/schema operation failed; no provider details are returned
- `500` server failure

### Side Effects
- Saves original title/description into `idea.original` if an older idea has no snapshot.
- Replaces `idea.enhanced` with structured enhancement output.
- Sets status to `enhancing` while processing, then `enhanced` on success.

### Database Changes
Updates `original`, `enhanced`, and `status` in the existing `Idea` document. The raw `title` and `description` remain preserved.

---

### Method
`POST`

### Route
`/api/ideas/:ideaId/analyze`

### Purpose
Analyzes the founder's final text—using `idea.enhanced.title` and `idea.enhanced.description` when present, otherwise the raw idea. AI returns structured evidence and team requirements only. The backend computes all final numeric scores and verdicts deterministically.

### Authentication
Firebase Bearer token required.

### Authorization
Only the owner of `ideaId` may analyze the idea.

### Request Body
None.

### Query Parameters
None.

### Validation
- `ideaId` must be a valid Mongo ObjectId.
- The stored idea text is bounded before it is passed to the AI provider.
- AI output must match the server-side Zod schema for evidence, roles, and requirements.
- AI-only differentiation is not proof of real-world novelty or uniqueness.

### Success Response
`200 OK`

```json
{
  "success": true,
  "message": "Idea analyzed successfully",
  "analysis": {
    "evidence": {
      "problem": { "clearlyDefined": true, "frequency": "high", "severity": "medium", "explanation": "..." },
      "audience": { "clearlyDefined": true, "primaryAudience": "...", "secondaryAudience": "...", "accessibility": "high" },
      "market": { "reach": "medium", "monetizable": true, "explanation": "..." },
      "feasibility": { "technicalComplexity": "medium", "resourceRequirement": "low", "mvpFeasibility": "high", "explanation": "..." },
      "differentiation": { "similarSolutionsKnown": true, "hasUniqueValue": true, "differentiationStrength": "medium", "explanation": "..." },
      "monetization": { "possible": true, "models": ["..."], "explanation": "..." },
      "execution": { "ideaClarity": "high", "scopeClarity": "medium" },
      "limits": { "assumptions": [], "risks": [], "limitations": [] }
    },
    "scoring": {
      "version": "v1",
      "overallScore": 72,
      "breakdown": {
        "problemStrength": 85,
        "marketPotential": 72,
        "feasibility": 75,
        "differentiation": 55,
        "executionReadiness": 80
      },
      "verdict": "PROMISING"
    },
    "rolesAndSkills": [
      {
        "role": "Frontend Developer",
        "skills": ["React"],
        "priority": "must-have",
        "count": 1,
        "experienceLevel": "Intermediate"
      }
    ],
    "isApproved": false
  }
}
```

### Error Responses
- `400` invalid object ID
- `401` missing/invalid Firebase token
- `403` authenticated user does not own the idea
- `404` user or idea not found
- `502` provider call or schema validation failed
- `500` server failure

### Side Effects
- Sets idea status to `analyzing` while generating evidence.
- Stores structured evidence, normalized skills, deterministic scoring, and team requirements.
- Sets status to `analyzed` on success; restores `enhanced` or `draft` on AI failure.

### Database Changes
Updates `Idea.aiAnalysis` and `Idea.status`. GET analysis never recomputes this saved result.

---

### Method
`GET`

### Route
`/api/ideas/:ideaId/analysis`

### Purpose
Returns the stored analysis only; it never calls AI or recomputes scores.

### Authentication
Firebase Bearer token required.

### Authorization
The owner may read any stored analysis. Other authenticated users may read only an approved analysis.

### Request Body
None.

### Query Parameters
None.

### Success Response
`200 OK` with `{ "success": true, "analysis": { ... } }`, or `analysis: null` when no analysis is stored.

### Error Responses
- `400` invalid object ID
- `401` missing/invalid Firebase token
- `403` non-owner reads unapproved analysis
- `404` idea not found
- `500` server failure

### Side Effects
None.

### Database Changes
None.

---

### Method
`PUT`

### Route
`/api/ideas/:ideaId/analysis`

### Purpose
Lets the idea owner update supported team-requirement fields and/or approve a previously stored analysis.

### Authentication
Firebase Bearer token required.

### Authorization
Only the owner of `ideaId` may update or approve analysis.

### Request Body

```json
{
  "rolesAndSkills": [{ "role": "Frontend Developer", "skills": ["React"], "priority": "must-have", "count": 1, "experienceLevel": "Intermediate" }],
  "techStack": ["React", "Node.js"],
  "domain": "SaaS",
  "teamSize": 2,
  "keyRequirements": ["..."],
  "nextSteps": ["..."],
  "approve": true
}
```

### Query Parameters
None.

### Validation
- `ideaId` must be a valid Mongo ObjectId.
- `rolesAndSkills`, when supplied, must be a non-empty array with a role field per entry.
- `teamSize`, when supplied, must be at least 1.
- An existing analysis is required before approval.
- Skill aliases are normalized against the canonical taxonomy when safely recognized.

### Success Response
`200 OK` with `{ "success": true, "message": "Analysis approved", "analysis": { ... } }`.

### Error Responses
- `400` invalid input or no existing analysis to approve
- `401` missing/invalid Firebase token
- `403` non-owner
- `404` user or idea not found
- `500` server failure

### Side Effects
When `approve: true`, sets `aiAnalysis.isApproved = true`, saves `approvedAt`, and transitions the idea to `matching`.

### Database Changes
Updates allowed `aiAnalysis` fields; approval modifies `aiAnalysis.isApproved`, `aiAnalysis.approvedAt`, and `Idea.status`.

## Idea Scoring Model

### Version
`v1`

### Principle
AI produces structured evidence only. The backend computes every score and verdict using deterministic rules. Given the same evidence, the result is identical.

### Dimensions and Weights

| Dimension | Weight | Deterministic evidence inputs |
| --- | ---: | --- |
| Problem Strength | 25% | `clearlyDefined`, problem frequency, severity |
| Market Potential | 25% | market reach, monetizable flag, audience definition/accessibility |
| Feasibility | 25% | MVP feasibility, technical complexity, resource requirement |
| Differentiation | 15% | unique value flag, differentiation strength, similar solutions flag |
| Execution Readiness | 10% | idea clarity and scope clarity |

### Rule Summary
- Each dimension is deterministically mapped to a score from `0` to `100`.
- Evidence enums map as follows where applicable: high/large = higher points; medium = intermediate points; low/small = lower points.
- For feasibility, lower technical complexity and resource requirement receive higher MVP-feasibility points.
- The weighted score is computed from exact dimension scores and rounded once for stored `overallScore`.
- No model-generated `overallScore`, `aiScore`, or verdict is accepted.

### Verdict Thresholds

| Overall score | Verdict |
| ---: | --- |
| 80–100 | `STRONG_POTENTIAL` |
| 65–79 | `PROMISING` |
| 45–64 | `NEEDS_REFINEMENT` |
| 0–44 | `HIGH_RISK` |

## 7) Matching APIs

/_
`GET /api/candidates/search/with-scores` — Ranked candidate search.
`GET /api/candidates/matches/:ideaId` — Get candidate match for idea.
_/

### GET /api/candidates/search/with-scores

Purpose: Allows a founder to search for candidates who match the skills and requirements defined in their startup idea, returned with compatibility scores.

### GET /api/candidates/matches/:ideaId

Purpose: Returns the compatibility match score and explanation for the currently authenticated candidate against a specific startup idea.

## 8) Invitation APIs

/_
`POST /api/invitations/` — Send invitation.
`GET /api/invitations/` — List invitations.
`GET /api/invitations/:invitationId` — Get invitation.
`PUT /api/invitations/:invitationId/accept` — Accept.
`PUT /api/invitations/:invitationId/decline` — Decline.
`PUT /api/invitations/:invitationId/withdraw` — Withdraw.
_/

### POST /api/invitations/

Purpose: Enables a founder to send an invitation to a candidate to join their startup team for a specific idea.

### GET /api/invitations/

Purpose: Lists all invitations sent by or received by the currently authenticated user (can be filtered by direction and status).

### GET /api/invitations/:invitationId

Purpose: Retrieves details of a specific invitation record.

### PUT /api/invitations/:invitationId/accept

Purpose: Allows a candidate to accept an invitation, transitioning its status to `Accepted`.

### PUT /api/invitations/:invitationId/decline

Purpose: Allows a candidate to decline an invitation, transitioning its status to `Declined`.

### PUT /api/invitations/:invitationId/withdraw

Purpose: Allows a founder to withdraw an invitation before it is acted upon, transitioning its status to `Withdrawn`.

## 9) Team APIs

/_
`POST /api/teams/` — Create team.
`GET /api/teams/` — List teams.
`GET /api/teams/:teamId` — Get team.
_/

### POST /api/teams/

Purpose: Creates a new team record for a startup idea once candidates have accepted invitations to join.

### GET /api/teams/

Purpose: Lists all teams that the currently authenticated user is a founder or member of.

### GET /api/teams/:teamId

Purpose: Retrieves details of a specific team, including all members and the founder.

## 10) Frontend integration notes

The backend is the source of truth for routing and schema. The following must match the backend exactly:

- User profile creation: `POST /api/users/profile`
- Candidate profile creation: `POST /api/users/candidate-profile`
- Sync after authenticate: `POST /api/users/sync`
- Matching: `GET /api/candidates/search/with-scores`
- Invitation endpoints live under `/api/invitations`
- Team endpoints live under `/api/teams`

Any frontend route using `/api/profiles`, `/api/candidates`, `/api/users/candidates/search`, or a different profile payload shape is not aligned with the live implementation.
