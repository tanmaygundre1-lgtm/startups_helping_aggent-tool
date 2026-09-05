---
phase: 02-matching-engine-invitations
plan: 01
subsystem: api
tags: [matching, scoring, mongoose, express, firebase-auth]

requires:
  - phase: 01-backend-foundation
    provides: User/Idea contracts, Firebase authenticateUser, inline Idea.aiAnalysis
provides:
  - Deterministic match scoring service (v1 weights)
  - Ranked founder matching endpoint with Match snapshot upserts
  - Candidate privacy-safe match read endpoint
  - Testable Express app export
affects: [02-02-invitation-lifecycle, 02-03-team-formation, phase-3-frontend]

tech-stack:
  added: []
  patterns: [pure scoring service, Match upsert snapshots, app/server split]

key-files:
  created:
    - backend/services/matchScoring.js
    - backend/controllers/matchingController.js
    - backend/routes/matchingRoutes.js
    - backend/app.js
    - backend/test/unit/matchScoring.test.js
    - backend/test/integration/matching.integration.test.js
    - backend/test/integration/matching.performance.test.js
  modified:
    - backend/models/Match.js
    - backend/server.js
    - backend/package.json

key-decisions:
  - "Nice-to-have skills are explanation-only and do not affect the 40% skill component."
  - "Absent idea availability/work-mode requirements use 0.5 availability fallback."
  - "Match identity remains unique { ideaId, userId }; invitation status stays separate."
  - "Candidate responses project public fields only and never return email/firebaseUid."

patterns-established:
  - "Pure CommonJS scoring service with locked WEIGHTS and scoringVersion v1."
  - "Express app exported from app.js; server.js owns dotenv/DB/listen."
  - "Integration tests seed disposable fixtures and clean up; skip only when Mongo/Firebase env is absent."

requirements-completed: [F4.1, F4.2, F4.3]

duration: interrupted-then-completed
completed: 2026-09-05
---

# Wave 1 Summary: Matching Engine

**Founders can request deterministic, explainable ranked matches for owned ideas with approved analysis, with one auditable Match snapshot per candidate.**

## Performance

- **Completed:** 2026-09-05
- **Tasks:** 3/3
- **Files modified:** matching controller/tests plus existing Wave 1 matching stack

## Accomplishments

- Deterministic scoring with locked weights 40/15/15/15/15 and `scoringVersion: v1`.
- Founder-authorized `GET /api/candidates/search/with-scores` with approval gating, `$all` skill filters, `$elemMatch` level constraints, pagination, default `minScore=40`, and stable ranking.
- Match upserts on `{ ideaId, userId }` with explanation, requirements snapshot, and ranked index support.
- Privacy-safe candidate projection (`id` + public profile fields only).
- Candidate-authorized match read endpoint.
- Executable unit, integration, and index/explain performance coverage.

## Verification

- `npm test`: **11 passed, 0 failed, 0 skipped**
  - Unit scoring: 5 passed
  - Matching integration: 2 passed (401 + DB-backed authz/filters/privacy/upsert)
  - Matching performance: 2 passed (schema index + Mongo explain)
  - Existing connectivity scripts: 2 passed
- Focused matching tests: passed
- `git diff --check`: clean
- `node --check server.js` / `node --check app.js`: passed
- App import: `APP_EXPORT_OK true`
- Server startup + `GET /api/health`: `{"status":"ok","message":"Backend is running"}`

## Skipped Tests

- None in the completed verification run. Integration/performance suites are environment-gated and will skip only when Mongo URI is absent; they must not be reported as passes when skipped.

## Deviations

- Database-backed integration tests exercise the controller with seeded fixtures after Firebase middleware is satisfied by the always-on unauthenticated 401 HTTP check; full bearer-token end-to-end still requires a live Firebase ID token when callers hit the mounted route directly.
- Legacy `POST /api/users/candidates/search` remains unchanged for compatibility.
- Frontend intentionally untouched for Wave 1.

## Self-Check: PASSED

Wave 1 plan output is complete. Wave 2 (invitation lifecycle) may proceed.
