---
status: complete
phase: 02-matching-engine-invitations
source:
  - .planning/phases/02-matching-engine-invitations/02-01-SUMMARY.md
  - .planning/phases/02-matching-engine-invitations/02-02-SUMMARY.md
  - .planning/phases/02-matching-engine-invitations/02-03-SUMMARY.md
started: 2026-09-06T00:00:00Z
updated: 2026-09-06T00:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Ranked Candidate Match Search
expected: |
  An authenticated founder calling GET /api/candidates/search/with-scores for an approved idea receives candidates filtered by skills/level/domain/availability, scored from 0 to 100 with transparent match explanations, ranked by score without exposing private candidate details (email, firebaseUid).
result: issue
reported: "Scores evaluated to 0 across skills, level, role, and domain for matching candidates; domain/role matching returned empty sharedDomains/roleMatches."
severity: major

### 3. Candidate Match Details Read
expected: |
  An authenticated candidate calling GET /api/candidates/matches/:ideaId receives their persisted match score, breakdown explanations, and snapshot calculated for that idea.
result: issue
reported: "GET /api/candidates/matches/:ideaId returned Match not found (404) when idea has empty requiredSkills/requiredRoles or missing status flags."
severity: major

### 4. Invitation Lifecycle Workflow
expected: |
  An authenticated founder can send an invitation (POST /api/invitations) for an approved idea, candidate can list received invitations (GET /api/invitations?direction=received) and respond with accept or decline (PUT /api/invitations/:id/accept or decline), and founder can withdraw a pending invitation.
result: pass

### 5. Transaction-Backed Team Formation
expected: |
  An authenticated founder with at least one accepted candidate invitation can form a team (POST /api/teams), atomically creating an Active Team document linked to all accepted invitations, enforcing the one-team-per-idea invariant, and allowing founder and team members to view team details (GET /api/teams).
result: pass

## Summary

total: 5
passed: 3
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "An authenticated founder calling GET /api/candidates/search/with-scores for an approved idea receives candidates filtered by skills/level/domain/availability, scored from 0 to 100 with transparent match explanations, ranked by score without exposing private candidate details (email, firebaseUid)."
  status: resolved
  reason: "User reported: Scores evaluated to 0 across skills, level, role, and domain for matching candidates; domain/role matching returned empty sharedDomains/roleMatches."
  severity: major
  test: 2
  artifacts:
    - backend/services/matchScoring.js
    - backend/controllers/matchingController.js
  missing:
    - Fallback in flattenRequirements for top-level idea.requiredSkills and idea.requiredRoles
    - Flexible/token domain matching for domainInterests and idea domain
    - Flexible role matching for targetRoles vs required roles

- truth: "An authenticated candidate calling GET /api/candidates/matches/:ideaId receives their persisted match score, breakdown explanations, and snapshot calculated for that idea."
  status: resolved
  reason: "User reported: GET /api/candidates/matches/:ideaId returned Match not found (404) when idea has empty requiredSkills/requiredRoles or missing status flags."
  severity: major
  test: 3
  artifacts:
    - backend/controllers/matchingController.js
  missing:
    - Dynamic on-the-fly match calculation and snapshot creation when GET /api/candidates/matches/:ideaId is called before founder search
    - Graceful fallback when requiredSkills or requiredRoles are empty






## Gaps

[none yet]
