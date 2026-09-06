# ROADMAP.md — StartupLink V1 Execution Plan

**Created:** 2026-08-25  
**Timeline:** 2 weeks (10 business days)  
**Status:** Ready for execution  
**Phase Approach:** Sequential (tight timeline, single developer)

---

## Vision

Execute the complete StartupLink V1 MVP from backend foundation through frontend UI in a disciplined 2-week sprint. Each phase is a testable increment that builds on the previous one.

---

## Timeline Overview

```
Week 1 (5 days):
  Mon-Fri: Phase 1 (Backend Foundation) + Phase 2 (Matching Engine)

Week 2 (5 days):
  Mon-Wed: Phase 3 (Invitations & Teams)
  Thu-Fri: Phase 4 (Frontend UI + Final Testing)

Total: 10 business days
```

---

## Phase 1: Backend Foundation & AI Integration

**Duration:** Days 1-5 (5 days)  
**Status:** Complete  
**Owner:** Developer (autonomous)

### Objectives

- Establish backend APIs for user management
- Integrate Vercel AI SDK for idea analysis
- Build the foundation for all downstream features

### Requirements in Scope

- F1.2: Founder profile creation
- F1.3: Candidate profile creation
- F2.1: Create startup idea
- F3.1: AI skill & role analysis

### Key Tasks

1. **User & Candidate Profiles** (Days 1-2)
   - [ ] `/api/profiles` endpoints (POST, GET, PUT)
   - [ ] Founder profile schema & validation
   - [ ] Candidate profile schema & validation
   - [ ] Skill taxonomy (hardcoded list or small DB collection)
   - [ ] Domain/category taxonomy
   - [ ] Database migrations / schema setup
   - [ ] Input validation & error handling
   - [ ] Authentication middleware (verify founder/candidate owns profile)

2. **Startup Idea Management** (Day 3)
   - [ ] `/api/ideas` endpoints (POST, GET, PUT)
   - [ ] Idea schema: title, description, domain, founder_id, status
   - [ ] Validation: description >50 chars, required fields
   - [ ] Can only modify own ideas
   - [ ] Status transitions: Draft → Under Analysis → Ready for Matching

3. **Vercel AI SDK Integration** (Days 4-5)
   - [ ] Initialize Vercel AI client with Claude/GPT API key
   - [ ] Create prompt template for idea analysis
   - [ ] `/api/ideas/:id/analyze` endpoint
   - [ ] Parse AI response into structured JSON format
   - [ ] Validation: All required fields present in response
   - [ ] Error handling: Timeout, API failures, malformed responses
   - [ ] Save analysis results to MongoDB
   - [ ] Allow founder to edit extracted roles/skills before proceeding
   - [ ] `/api/ideas/:id/analysis` GET and PUT endpoints

### Success Criteria

- [ ] All 3 endpoints sets functional and tested manually
- [ ] Founder can create profile, create idea, trigger AI analysis
- [ ] AI analysis returns structured roles/skills array
- [ ] Founder can edit AI suggestions and save
- [ ] Database contains test data: 1 founder, 1 idea, 1 analysis
- [ ] No critical backend errors when testing end-to-end

### Risks & Mitigations

| Risk                                | Mitigation                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| Vercel AI SDK learning curve        | Start with simple prompt, iterate based on output quality      |
| JSON structure from AI inconsistent | Add post-processing validation layer, test with multiple ideas |
| MongoDB schema changes mid-phase    | Design schema upfront, use migrations if needed                |

### Deliverables

- Backend code in `backend/` (routes, controllers, models)
- MongoDB schemas for User, Candidate, Idea, Analysis
- `.planning/PHASE-1-NOTES.md` (decisions, learnings, issues)
- Commit: "feat: Phase 1 backend foundation and AI integration"

### Test Data Needed

- 1 test founder account
- 1-2 test ideas with varied descriptions
- Verify AI extraction works correctly

---

## Phase 2: Matching Engine & Invitations

**Duration:** Days 6-10 (5 days)  
**Status:** In progress (Wave 1 complete)  
**Owner:** Developer (autonomous)

### Objectives

- Implement candidate search and ranking
- Build invitation/acceptance workflow
- Enable team formation

### Plans

- [x] 02-01-PLAN.md — Deterministic matching, candidate search, and ranked score snapshots
- [x] 02-02-PLAN.md — Invitation lifecycle with conditional accept/decline/withdraw transitions
- [x] 02-03-PLAN.md — Transaction-backed one-team-per-idea formation and protected team reads

### Requirements in Scope

- F4.1: Search & filter candidates
- F4.2: Calculate match score
- F4.3: Display ranked matches
- F5.1: Send invitation
- F5.2: Accept/decline invitation
- F5.3: Form team

### Key Tasks

1. **Candidate Search & Matching** (Days 6-7)
   - [ ] `/api/candidates/search` endpoint with filters
   - [ ] Filter by: skills, experience level, domain, work preference, availability
   - [ ] Query optimization (indexing, efficient filters)
   - [ ] Returns paginated results
   - [ ] Implement match score calculation function
   - [ ] Create unit tests for match algorithm (various scenarios)
   - [ ] Store match scores in results

2. **Invitations & Acceptance** (Day 8)
   - [ ] `/api/invitations` endpoints (POST create, GET list)
   - [ ] `/api/invitations/:id` endpoints (PUT accept/decline/withdraw)
   - [ ] Invitation schema: from_founder, to_candidate, idea_id, role, status, timestamps
   - [ ] Validation: Candidate not already on another team for same idea
   - [ ] Notification handling (log invitations, prepare for UI notifications)
   - [ ] Status workflow: Pending → Accepted/Declined/Withdrawn

3. **Team Formation** (Days 9-10)
   - [ ] `/api/teams` endpoints (POST create, GET retrieve, GET list)
   - [ ] Team schema: name, founder_id, members (array), status, created_date
   - [ ] Create team from accepted invitations
   - [ ] Validate all members have accepted before team creation
   - [ ] Team status: Active, Archived
   - [ ] Business logic: Founder decides when team is "complete" (not waiting for all roles)
   - [ ] Link candidates to teams
   - [ ] Prevent double-booking (candidate can't join multiple teams for same idea)

### Success Criteria

- [ ] Candidate search works with filters
- [ ] Match score calculated correctly for test data
- [ ] Invitations can be sent, accepted, declined
- [ ] Teams created with accepted members
- [ ] No candidate can join multiple teams
- [ ] Database reflects all changes (invitations, teams)
- [ ] Manual testing: Founder searches → finds candidates → invites → team forms

### Risks & Mitigations

| Risk                                               | Mitigation                                                |
| -------------------------------------------------- | --------------------------------------------------------- |
| Match algorithm weights not realistic              | Test with sample data, adjust weights if needed           |
| Database queries slow with large dataset           | Add indexes on frequently queried fields (skills, domain) |
| Race condition: candidate accepts multiple invites | Add database constraints or transaction logic             |

### Deliverables

- Backend routes & controllers for search, invitations, teams
- Match algorithm function with unit tests
- Database indexes for performance
- `.planning/PHASE-2-NOTES.md` (match algorithm decisions, test results)
- Commit: "feat: Phase 2 matching engine and invitations"

### Test Data Needed

- 5-10 candidate profiles with varied skills/interests
- 2-3 startup ideas with different role requirements
- Test invitation flows, team formation

---

## Phase 3: Frontend UI & Integration

**Duration:** Days 6-10 (Concurrent with Phase 2)
**Status:** Planned
**Owner:** Developer (autonomous)

### Objectives

- Develop React frontend for StartupLink V1
- Integrate profile creation and idea creation with backend API

### Plans

- [ ] 03-01-PLAN.md — React/Vite/Header/API Setup
- [ ] 03-02-PLAN.md — Onboarding/Idea Forms

### Requirements in Scope

- FE-01: Setup React/Vite
- FE-02: Implement Core UI Components
- FE-03: API and Auth Configuration
- FE-04: Founder/Candidate Onboarding
- FE-05: Idea Creation

### Success Criteria

- [ ] React project is buildable and runs via Vite
- [ ] Header and global components follow UI-SPEC
- [ ] Founder/Candidate can create profile on UI
- [ ] Founder can create startup ideas via UI
- [ ] All forms submit valid JSON to backend APIs
- [ ] API service layer handles tokens and errors

### Deliverables

- React frontend code in `frontend/`
- Component library based on design tokens
- Service layer for API abstraction
- Commit: "feat: Phase 3 frontend UI and integration"

### Test Data & Scenarios

- Test as founder: Sign up → create idea → see AI analysis → search candidates → invite → form team
- Test as candidate: Sign up → see discovery → receive invitation → accept → view team
- Test on mobile device (iPhone/Android simulation)

---

## Phase 4: Testing, Security Hardening & Deployment Prep

**Duration:** Days 15+ (overflow/nice-to-have)  
**Status:** Blocked (post-MVP)  
**Owner:** Developer

### Objectives (Post-MVP, if time allows)

- Security audit and fixes
- Test coverage for critical paths
- Deployment planning

### Tasks (Lower Priority, Do If Time)

1. Security review
   - [ ] Audit Firebase config (no keys exposed in frontend)
   - [ ] Verify CORS is correctly configured
   - [ ] SQL injection / NoSQL injection protection
   - [ ] Input sanitization on all endpoints
   - [ ] Authorization checks (user can only access own data)

2. Testing
   - [ ] Unit tests for match algorithm (different scenarios)
   - [ ] Unit tests for profile validation
   - [ ] Integration test for full idea→analysis→match flow
   - [ ] E2E test script (founder journey)

3. Documentation
   - [ ] API documentation (endpoint list, sample payloads)
   - [ ] Setup instructions for next developer
   - [ ] Known issues & workarounds

### Success Criteria

- [ ] No high-severity security issues
- [ ] Critical business logic has unit tests
- [ ] Setup doc allows another dev to run the project

### Deliverables

- Security audit report
- Unit tests (match algorithm, validation)
- API documentation
- Setup guide
- Commit: "chore: Phase 4 testing and hardening"

---

## Cross-Phase Dependencies

```
Phase 1 (Backend + AI)
  ↓ (depends on)
Phase 2 (Matching + Invitations)
  ↓ (depends on)
Phase 3 (Frontend UI)
  ↓ (depends on)
Phase 4 (Testing & Hardening)
```

**Sequential Execution:** Phases cannot overlap. Each phase must complete before the next begins.

---

## Success Metrics

### Phase 1 Success

- [ ] API endpoints respond correctly
- [ ] AI analysis extracts roles/skills from 5 sample ideas
- [ ] Founder can create profile and idea

### Phase 2 Success

- [ ] Candidate search returns relevant results
- [ ] Match scores make intuitive sense (high skills match = high score)
- [ ] Invitations sent and accepted correctly
- [ ] Team created with correct members

### Phase 3 Success

- [ ] Founder completes full end-to-end flow
- [ ] UI is usable and responsive
- [ ] No critical bugs blocking the flow

### Final Success (All Phases)

- ✅ Complete working MVP: Idea → AI → Match → Team
- ✅ Deployable code (no console errors)
- ✅ Real user can use it end-to-end

---

## Known Constraints & Assumptions

| Constraint                   | Impact            | Mitigation                          |
| ---------------------------- | ----------------- | ----------------------------------- |
| 2-week timeline              | Very aggressive   | Strict MVP scope, no feature creep  |
| Single developer             | Limited bandwidth | Focus on backend first, UI second   |
| Zero existing tests          | Risk of bugs      | Plan testing for critical paths     |
| Vercel AI SDK untested       | Risk of delays    | Start early, have fallback approach |
| Limited design upfront       | Risk of rework    | Use simple, minimal UI design       |
| College-based candidate pool | Scalability TBD   | Seed with test data for MVP         |

---

## Version History

| Version | Date       | Changes                                     |
| ------- | ---------- | ------------------------------------------- |
| 1.0     | 2026-08-25 | Initial roadmap (4 phases, 2-week timeline) |

---

## Approval & Next Steps

✅ **ROADMAP Ready for Execution**

**Next Command:** `/gsd-plan-phase 1`

This will create a detailed PLAN.md for Phase 1 with specific tasks, dependencies, and implementation guidance.

---

**Prepared by:** AI Assistant (Claude)  
**Approved by:** Project Owner  
**Status:** Ready for Execution ✅
