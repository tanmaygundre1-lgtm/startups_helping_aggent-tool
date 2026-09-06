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

### POST /api/ideas

Request body:

```json
{
  "title": "AI founder matching app",
  "description": "A platform to match startup founders with technical co-founders.",
  "category": "B2B SaaS",
  "domain": "AI",
  "problemStatement": "Founders struggle to find trustworthy technical partners.",
  "targetUsers": "Early-stage founders",
  "requiredSkills": ["Product", "Machine Learning", "Frontend"]
}
```

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

### GET /api/ideas

Query params: `status`, `limit`, `skip`

Response:

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
      "status": "draft",
      "aiAnalysis": {
        "isApproved": false
      },
      "createdAt": "ISO date"
    }
  ],
  "total": 1
}
```

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

## 6) Matching APIs

### GET /api/candidates/search/with-scores

Purpose: ranked, scored candidate search for a founder-owned idea.

Query params:

```text
ideaId=ObjectId
skills=React,Node.js
level=Advanced
domain=AI
workMode=remote
availability=full-time
sort=best
page=1
limit=10
minScore=40
```

Validation rules:

- `ideaId` must be valid Mongo ObjectId
- Authenticated user must own the idea
- Idea must exist and have approved AI analysis
- `minScore` is clamped to `0..100`
- `page` and `limit` are bounded

Success response:

```json
{
  "success": true,
  "matches": [
    {
      "matchId": "ObjectId",
      "candidate": {
        "id": "ObjectId",
        "name": "Jane",
        "profileImage": "https://...",
        "college": { "name": "" },
        "location": { "city": "", "state": "", "region": "" },
        "skills": [{ "name": "React", "level": "Advanced" }],
        "targetRoles": ["Frontend Engineer"],
        "domainInterests": ["AI"],
        "availability": "full-time",
        "workPreference": "remote",
        "hoursPerWeek": 20
      },
      "score": 87,
      "explanation": {
        "matchedSkills": ["React"],
        "missingSkills": ["System Design"],
        "score": 87
      },
      "invitationStatus": null,
      "createdAt": "ISO date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "sort": "best",
  "minScore": 40
}
```

### GET /api/candidates/matches/:ideaId

Purpose: get the current authenticated candidate’s match score for a specific idea.

Response:

```json
{
  "success": true,
  "match": {
    "_id": "ObjectId",
    "ideaId": "ObjectId",
    "userId": "ObjectId",
    "matchScore": 78,
    "explanation": {
      "matchedSkills": ["React"],
      "missingSkills": ["Machine Learning"]
    },
    "scoringVersion": "v1",
    "calculatedAt": "ISO date",
    "refreshedAt": "ISO date"
  }
}
```

Status codes:

- `400` invalid idea ID
- `401` no profile
- `404` idea not found
- `500` match generation failure

## 7) Invitation APIs

### POST /api/invitations

Request body:

```json
{
  "ideaId": "ObjectId",
  "candidateId": "ObjectId",
  "role": "Frontend Engineer",
  "message": "We would love to have you on the project."
}
```

Validation rules:

- `ideaId` and `candidateId` must be valid Mongo IDs
- `role` must be a string with minimum length 2
- Founder must own the idea
- Idea must have approved AI analysis
- Candidate must be a completed candidate profile and not the founder
- Candidate must have an existing match snapshot for the idea
- Invitation cannot already be Pending/Accepted
- Withdrawn invitation cannot be reopened

Success responses:

- `201` created invitation
- `200` updated invitation when reusing an existing record

Typical response:

```json
{
  "success": true,
  "invitation": {
    "_id": "ObjectId",
    "ideaId": "ObjectId",
    "fromFounder": "ObjectId",
    "toCandidate": "ObjectId",
    "role": "Frontend Engineer",
    "status": "Pending"
  }
}
```

### GET /api/invitations

Query params:

- `status` = `Pending | Accepted | Declined | Withdrawn`
- `direction` = `sent | received`

Response:

```json
{
  "success": true,
  "invitations": [
    {
      "_id": "ObjectId",
      "ideaId": {
        "_id": "ObjectId",
        "title": "...",
        "domain": "...",
        "status": "matching"
      },
      "fromFounder": { "_id": "ObjectId", "name": "Jane" },
      "toCandidate": { "_id": "ObjectId", "name": "Sam" },
      "role": "Frontend Engineer",
      "status": "Pending"
    }
  ]
}
```

### PUT /api/invitations/:invitationId/accept

Transition rules:

- Only the candidate on the invitation can accept
- Only `Pending` invitations can be accepted
- Returns `200` with updated invitation
- If already accepted, returns idempotent `200`

### PUT /api/invitations/:invitationId/decline

Same as accept but for decline.

### PUT /api/invitations/:invitationId/withdraw

Only the founder can withdraw; it sets `status: "Withdrawn"`.

## 8) Team APIs

### POST /api/teams

Request body:

```json
{
  "ideaId": "ObjectId",
  "name": "Team Alpha"
}
```

Validation rules:

- `ideaId` must be valid ObjectId
- `name` must be 2-120 characters
- Authenticated user must own the idea
- A team already exists for the idea -> `409`
- At least one accepted invitation is required -> `409 NO_ACCEPTED_INVITATIONS`

Success response:

```json
{
  "success": true,
  "team": {
    "_id": "ObjectId",
    "ideaId": "ObjectId",
    "founderId": { "_id": "ObjectId", "name": "Jane" },
    "name": "Team Alpha",
    "members": [
      {
        "userId": { "_id": "ObjectId", "name": "Sam" },
        "role": "Frontend Engineer",
        "invitationId": "ObjectId",
        "joinedAt": "ISO date"
      }
    ],
    "status": "Active"
  }
}
```

### GET /api/teams

Lists all teams where the current user is founder or member.

### GET /api/teams/:teamId

Returns one team if the current user is authorized.

## 9) Frontend integration notes

The backend is the source of truth for routing and schema. The following must match the backend exactly:

- User profile creation: `POST /api/users/profile`
- Candidate profile creation: `POST /api/users/candidate-profile`
- Sync after authenticate: `POST /api/users/sync`
- Matching: `GET /api/candidates/search/with-scores`
- Invitation endpoints live under `/api/invitations`
- Team endpoints live under `/api/teams`

Any frontend route using `/api/profiles`, `/api/candidates`, `/api/users/candidates/search`, or a different profile payload shape is not aligned with the live implementation.
