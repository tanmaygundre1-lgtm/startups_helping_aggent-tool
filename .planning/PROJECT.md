# PROJECT.md — StartupLink

**Last Updated:** 2026-08-25  
**Status:** Initialization  
**Phase:** V1 MVP (2-week execution window)

---

## Vision

StartupLink is an AI-powered platform that helps students turn startup ideas into real teams. It solves the critical problem of team formation for young entrepreneurs:

- **Founders' Pain:** Students with great startup ideas struggle to find teammates with complementary skills
- **Skilled Students' Pain:** Talented developers, designers, and business students can't easily discover exciting startup ideas to join
- **Solution:** StartupLink analyzes startup ideas, identifies required skills and roles, and intelligently matches founders with suitable teammates

---

## Primary Users (V1)

**Idea Founders** — Students with startup ideas seeking to build teams  
Currently bootstrapping with college-based talent pool.

Secondary users (v1.1+): Skilled students looking for startup opportunities

---

## Core Problem & Opportunity

### Problem
- Founders waste time manually searching for teammates across LinkedIn, Discord, campus networks
- No structured way to understand what skills a startup actually needs
- Skills-to-role matching is ad-hoc and often relies on personal networks

### Opportunity
- Centralized platform for team formation within college ecosystem
- AI-powered skill analysis turns vague ideas into concrete team requirements
- Algorithmic matching increases compatibility and success rate of formed teams

---

## V1 MVP Scope (2-Week Timeline)

**One Complete End-to-End Flow:**

```
User Login/Signup
  ↓
Founder creates Startup Idea (description, domain, vision)
  ↓
AI analyzes required skills, roles, tech stack, levels
  ↓
Founder reviews & edits AI suggestions
  ↓
Generate Team + Filter candidates
  ↓
View ranked matches with match scores & explanations
  ↓
Send invitations to suitable candidates
  ↓
Candidates accept → Team formed
```

### V1 Core Features
1. **Student Profile** — Skills, interests, domain preferences, availability, work mode (remote, in-person, hybrid)
2. **Startup Idea Creation** — Founder enters idea, description, domain/category, vision
3. **AI Skill/Role Analysis** — Extract required roles, skills, tech stack, priority levels, experience levels, team size
4. **Candidate Search & Filtering** — Find college students matching extracted requirements
5. **Match Scoring & Explanation** — Score algorithm showing how candidates align
6. **Invitation System** — Founder sends invitations, candidates accept/decline
7. **Team Dashboard** — View formed teams and team members

### Explicitly Out of V1 Scope
- LinkedIn search integration
- AI chatbot/concierge
- Task management
- Advanced analytics
- Startup pitch deck generation
- Investor matching
- Post-team collaboration tools

---

## Tech Stack

- **Frontend:** React 18 + Vite, TailwindCSS, Axios/fetch
- **Backend:** Node.js + Express, middleware for auth/cors
- **Database:** MongoDB (user, startup idea, candidate profile, team, invitation models)
- **Authentication:** Firebase Auth (already implemented)
- **AI Features:** Vercel AI SDK (Claude/GPT for structured output, tool calling, agent workflows)
- **Deployment:** TBD (local development for MVP)

---

## Current State

✅ **Complete:**
- Authentication system (Firebase Auth)
- Database connection (MongoDB)
- Basic project structure (frontend: React/Vite, backend: Express)
- User, Idea, Match models defined

❌ **Remaining:**
- All feature endpoints and business logic
- AI analysis integration
- Matching algorithm
- Invitation/acceptance workflow
- Candidate search/filter
- Team formation
- Dashboard UI
- Error handling & validation
- Tests (currently zero coverage)

---

## Key Workflow Details

### 1. Founder Creates Startup Idea
Input: Description, domain, vision, problem statement  
Output: Idea record in DB

### 2. AI Analysis
Input: Startup idea description + metadata  
AI extracts:
- **Team Roles** (e.g., Backend Developer, Frontend Developer, UI/UX Designer)
- **Required Skills** (e.g., React, Node.js, Python)
- **Skill Priority** (Must-have vs. Nice-to-have)
- **Count per Role** (How many developers, designers, etc.)
- **Experience Level** (Beginner, Intermediate, Advanced)
- **Domain/Category** (EdTech, FinTech, AI, etc.)
- **Key Requirements** (Suggested tech decisions, timeline hints)

Founder reviews and can edit all suggestions before proceeding.

### 3. Generate Team & Matching
System queries student database for candidates matching required skills.

**Match Score Algorithm (0-100):**
- Required Skill Match: 40% (how many required skills do they have)
- Skill Level Match: 15% (compatibility between required and student's level)
- Role Preference: 15% (does student want this role type)
- Interest/Domain Match: 15% (does student care about this domain)
- Availability & Work Preference: 15% (can they commit, work mode alignment)

Results show:
- Candidate name, profile summary, skills
- Match score (0-100)
- **Why they matched:** Matched skills, missing skills, shared interests
- CTA: "Send Invitation"

### 4. Invitation & Acceptance
Founder sends invitation to candidate.  
Candidate receives notification → can Accept or Decline.  
When minimum team formed (or founder decides): Team created successfully.

---

## Success Criteria (End of V1, 2 Weeks)

✅ **Must Have (Day 14):**
- [ ] End-to-end flow works: Idea → AI Analysis → Matching → Team formed
- [ ] AI correctly extracts roles and skills from idea descriptions
- [ ] Matching algorithm scores candidates with explainability
- [ ] Invitations sent and accepted, teams created
- [ ] Founder and candidate dashboards show results
- [ ] No critical bugs blocking the flow

✅ **Nice-to-Have (if time allows):**
- [ ] Candidate search/filtering UI polish
- [ ] Better match explanations
- [ ] Rate/feedback on matches
- [ ] Improved error messages

---

## Known Challenges & Constraints

1. **Timeline Pressure** — 2 weeks is aggressive for a developer new to the stack
   - **Mitigation:** Strict MVP focus, no feature creep, simple UI

2. **AI Integration Complexity** — First time using Vercel AI SDK + structured output
   - **Mitigation:** Start with simple Claude prompts, iterate on extraction quality
   - **Research:** Verify Vercel AI SDK handles structured JSON output correctly

3. **Matching Algorithm Design** — Scoring formula needs validation
   - **Mitigation:** Use weights from discovery session, test with sample data

4. **Zero Test Coverage** — Current codebase has no tests
   - **Mitigation:** Add basic unit tests for matching algorithm + critical paths during execution

5. **DB Schema Gaps** — Match, Invitation, Team models may need revision
   - **Mitigation:** Iterate schema during implementation based on actual feature needs

6. **Candidate Profile Data** — Need to seed test profiles for matching demo
   - **Mitigation:** Create ~10-15 sample student profiles for testing

---

## Codebase Map Reference

See `.planning/codebase/` for detailed analysis:
- **STACK.md** — Tech stack breakdown (React 18, Node.js, MongoDB, Firebase)
- **ARCHITECTURE.md** — Frontend-backend communication patterns, data flow
- **STRUCTURE.md** — Directory organization, key files
- **CONVENTIONS.md** — Naming (camelCase/PascalCase), module patterns
- **TESTING.md** — ⚠️ **Zero test coverage** — needs attention post-MVP
- **CONCERNS.md** — 40+ concerns flagged: exposed API keys, CORS issues, security gaps, testing gaps

### Critical Concerns for V1
- [ ] Exposed API keys — Audit Firebase config, secure before launch
- [ ] CORS configuration — Verify allowed origins before production
- [ ] No test coverage — Plan to add tests after MVP is feature-complete
- [ ] Security validation — Auth and data access need review post-MVP

---

## Next Steps

1. ✅ **Done:** PROJECT.md created, codebase mapped
2. **Next:** `/gsd-plan-phase 1` — Plan the first implementation phase
3. **Then:** Execute phases with `gsd-execute-phase`
4. **Finally:** Verify delivered features match V1 requirements

---

## Project Metadata

- **Team Size:** 1 developer (bootstrapping)
- **Timeline:** 2 weeks (hard deadline for v1 MVP)
- **Model Profile:** Balanced (Sonnet for most work, Opus for critical decisions)
- **Execution Mode:** Sequential (single developer, manageable scope)
- **Git Tracking:** Yes (planning docs + code in version control)

---

**Status:** Ready for Phase Planning  
**Decision Gate:** Approved ✅
