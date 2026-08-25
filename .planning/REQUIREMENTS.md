# REQUIREMENTS.md — StartupLink V1 MVP

**Created:** 2026-08-25  
**Version:** 1.0  
**Status:** Approved for execution  
**Timeline:** 2 weeks

---

## Overview

StartupLink V1 is an AI-powered team-formation platform for student founders. This document specifies all features, user stories, and acceptance criteria for the minimum viable product.

---

## Feature Categories

### F1: User Onboarding & Profiles

#### F1.1 Authentication (Firebase, Already Complete)
- Users can sign up with email/password
- Users can log in and retrieve session token
- Firebase Auth manages credential security

#### F1.2 Founder Profile Creation
**Description:** When a founder logs in for the first time, they complete their profile.

**User Story:**
> As a student with a startup idea, I want to create a profile so I can be discovered and tracked by the system.

**Acceptance Criteria:**
- [ ] Form to enter: Full name, email, university, major/domain
- [ ] Profile saved to MongoDB
- [ ] Profile data available for team assignments
- [ ] Profile can be updated after creation
- [ ] Error handling for invalid inputs (empty fields, email format)

**Definition of Done:**
- Endpoint: `POST /api/profiles` (create)
- Endpoint: `GET /api/profiles/:id` (read own profile)
- Endpoint: `PUT /api/profiles/:id` (update)
- Returns: User ID, profile object, success/error messages

---

#### F1.3 Candidate Profile Creation
**Description:** Skilled students complete profiles showing their skills and interests.

**User Story:**
> As a skilled developer/designer looking for startups, I want to create a profile with my skills so I can be matched with founders.

**Acceptance Criteria:**
- [ ] Form to enter: Name, email, skills (select from list), experience level (Beginner/Intermediate/Advanced)
- [ ] Form to enter: Domain interests (EdTech, FinTech, AI, Health, etc.)
- [ ] Form to enter: Preferred roles (Backend Dev, Frontend Dev, Designer, etc.)
- [ ] Form to enter: Work preference (Remote, In-person, Hybrid)
- [ ] Form to enter: Availability (Full-time, Part-time, Hours/week)
- [ ] Profile saved to MongoDB
- [ ] Skills list is normalized (predefined taxonomy)
- [ ] Error handling and validation

**Definition of Done:**
- Endpoint: `POST /api/candidates` (create)
- Endpoint: `GET /api/candidates/:id` (read)
- Endpoint: `PUT /api/candidates/:id` (update)
- Endpoint: `GET /api/skills` (list all predefined skills)
- Endpoint: `GET /api/domains` (list all domains)
- Returns: Candidate ID, profile object, normalized skills array

---

### F2: Startup Idea Management

#### F2.1 Create Startup Idea
**Description:** Founder describes their startup idea and vision.

**User Story:**
> As a founder, I want to input my startup idea so the system can analyze what team I need.

**Acceptance Criteria:**
- [ ] Form to enter: Idea title (required)
- [ ] Form to enter: Idea description/pitch (required, text area)
- [ ] Form to enter: Domain/category (dropdown from predefined list)
- [ ] Form to enter: Problem statement (optional)
- [ ] Form to enter: Target users (optional)
- [ ] Idea saved to MongoDB with status "Draft"
- [ ] Idea linked to founder's profile
- [ ] Validation: Description minimum 50 characters
- [ ] User can view/edit their own ideas before AI analysis

**Definition of Done:**
- Endpoint: `POST /api/ideas` (create)
- Endpoint: `GET /api/ideas/:id` (read)
- Endpoint: `PUT /api/ideas/:id` (edit before analysis)
- Endpoint: `GET /api/ideas` (list user's ideas)
- Returns: Idea ID, status, full idea object

---

### F3: AI-Powered Analysis

#### F3.1 AI Skill & Role Analysis
**Description:** AI analyzes idea description and extracts required roles, skills, and team composition.

**User Story:**
> As a founder, I want the AI to analyze my idea and tell me what skills and roles I need for my team.

**Acceptance Criteria:**
- [ ] API receives startup idea description
- [ ] Calls Vercel AI SDK to Claude/GPT with structured prompt
- [ ] AI extracts: Required roles (array), Required skills (array), Priority (must-have/nice-to-have)
- [ ] AI extracts: Count per role, Experience level needed (Beginner/Intermediate/Advanced)
- [ ] AI extracts: Tech stack suggestions, Key project requirements
- [ ] Response is structured JSON (not free-form text)
- [ ] Founder sees AI suggestions and can edit them before proceeding
- [ ] Edited suggestions are saved (founder's customization tracked)
- [ ] Timeout handling (default fallback if AI takes >10s)
- [ ] Error handling for API failures

**Detailed Output Format:**
```json
{
  "roles_and_skills": [
    {
      "role": "Backend Developer",
      "skills": ["Node.js", "MongoDB", "REST API"],
      "priority": "must-have",
      "count": 1,
      "experience_level": "Intermediate"
    },
    {
      "role": "Frontend Developer",
      "skills": ["React", "TailwindCSS", "UI Components"],
      "priority": "must-have",
      "count": 1,
      "experience_level": "Intermediate"
    }
  ],
  "tech_stack": ["Node.js", "React", "MongoDB", "Firebase"],
  "domain": "EdTech",
  "team_size": 2,
  "key_requirements": ["Fast prototyping", "User authentication", "Scalable data storage"],
  "next_steps": ["Design data model", "Set up CI/CD", "Plan MVP features"]
}
```

**Definition of Done:**
- Endpoint: `POST /api/ideas/:id/analyze` (trigger AI analysis)
- Endpoint: `GET /api/ideas/:id/analysis` (read analysis results)
- Endpoint: `PUT /api/ideas/:id/analysis` (founder edits analysis)
- Vercel AI SDK integrated with Claude/GPT
- Response schema matches above format
- All fields populated and validated

---

### F4: Candidate Matching

#### F4.1 Search & Filter Candidates
**Description:** System retrieves candidates matching the analyzed skill requirements.

**User Story:**
> As a founder, I want to search for candidates whose skills match my startup's needs.

**Acceptance Criteria:**
- [ ] Query candidates by required skills (all must-have skills, some nice-to-have)
- [ ] Filter by experience level (exact match or range)
- [ ] Filter by domain interest (candidates interested in same domain)
- [ ] Filter by work preference (remote, in-person, hybrid)
- [ ] Filter by availability (part-time, full-time, hours/week)
- [ ] Returns: List of matching candidates with profile data
- [ ] Pagination support (default: 10 per page)
- [ ] Sorting options: Best match, Name, Newest profile
- [ ] No duplicate candidates in results

**Definition of Done:**
- Endpoint: `GET /api/candidates/search?skills=X&level=Y&domain=Z&workMode=W` (search)
- Endpoint: `GET /api/candidates/search?ideas/:ideaId` (search by analyzed idea)
- Returns: Array of candidate objects, pagination metadata
- Query performance: <500ms for realistic dataset size

---

#### F4.2 Calculate Match Score
**Description:** System scores each candidate against the startup's requirements using a transparent algorithm.

**User Story:**
> As a founder, I want to see which candidates are the best fit and why.

**Acceptance Criteria:**
- [ ] Match score calculated as weighted formula: 0-100
- [ ] Scores include: Skills match (40%), Level match (15%), Role preference (15%), Domain interest (15%), Availability (15%)
- [ ] Score is deterministic (same inputs = same score)
- [ ] Explanation shows: Matched skills, missing skills, shared interests
- [ ] Candidate can see their own match score for ideas they're matched to
- [ ] Match scores persisted for auditability

**Match Score Formula:**
```
skills_match_score = (matched_must_have_skills / total_must_have_skills) * 100
skills_match = (skills_match_score) * 0.40

level_match = (experience_level_compatibility) * 0.15  // 1.0 = perfect, 0.5 = partial
role_preference = (candidate_has_role_interest) * 0.15  // 1.0 or 0.0
domain_interest = (candidate_interested_in_domain) * 0.15  // 1.0 or 0.0
availability = (can_meet_time_commitment) * 0.15  // 1.0 or 0.5

TOTAL_SCORE = skills_match + level_match + role_preference + domain_interest + availability
```

**Definition of Done:**
- Function: Calculate match score for (candidate, idea_analysis)
- Returns: Score (0-100), explanation object with matched/missing skills
- Used in: Candidate ranking, match display
- Unit tested with sample data

---

#### F4.3 Display Ranked Matches
**Description:** Show founder a ranked list of best-matching candidates with explanations.

**User Story:**
> As a founder, I want to see my best matches ranked by compatibility.

**Acceptance Criteria:**
- [ ] Candidates displayed in descending score order (highest first)
- [ ] Each candidate shows: Name, score, key matched skills, missing skills
- [ ] Shows explanation: Why this person is a good fit
- [ ] Show action buttons: "Send Invitation" or "View Profile"
- [ ] Can click to see full candidate profile
- [ ] No candidates below score threshold (e.g., <40) shown by default
- [ ] Can toggle to show lower-scoring matches
- [ ] Refreshable match list (recalculate scores)

**Definition of Done:**
- Frontend component displays ranked candidate matches
- Consumes: `/api/candidates/search/with-scores` endpoint
- Shows all required information clearly
- Responsive design works on desktop and mobile

---

### F5: Invitations & Team Formation

#### F5.1 Send Invitation
**Description:** Founder sends an invitation to a candidate to join their team.

**User Story:**
> As a founder, I want to invite specific candidates to my team.

**Acceptance Criteria:**
- [ ] Founder can send invitation from match display
- [ ] Invitation includes: Founder name, startup idea, role being offered, match score context
- [ ] Invitation saved to MongoDB with status "Pending"
- [ ] Candidate receives notification of invitation
- [ ] Invitation includes: Accept button, Decline button, View Idea button
- [ ] Founder can see list of sent invitations and their statuses
- [ ] Can resend invitation if declined
- [ ] Can withdraw invitation before candidate responds

**Definition of Done:**
- Endpoint: `POST /api/invitations` (send)
- Endpoint: `GET /api/invitations` (list by user)
- Endpoint: `PUT /api/invitations/:id` (update status: accept/decline/withdraw)
- Invitation data model: From, To, Idea, Role, Status, Timestamp
- Notifications: In-app or email when invitation received

---

#### F5.2 Accept/Decline Invitation
**Description:** Candidate responds to invitation to join or decline.

**User Story:**
> As a candidate, I want to accept or decline invitations to join startups.

**Acceptance Criteria:**
- [ ] Candidate sees list of pending invitations
- [ ] Can view startup idea details before responding
- [ ] Can accept invitation → joins team
- [ ] Can decline invitation → stays unallocated
- [ ] Once accepted, candidate linked to team
- [ ] Founder notified of acceptance/decline immediately
- [ ] Invitation status updated in real-time
- [ ] Candidate can only have one active team per founder (no double-booking)

**Definition of Done:**
- Endpoint: `PUT /api/invitations/:id/accept`
- Endpoint: `PUT /api/invitations/:id/decline`
- Returns: Updated invitation status, team assignment if accepted

---

#### F5.3 Form Team
**Description:** When founder has accepted members, team is created and is "live."

**User Story:**
> As a founder with accepted candidates, I want to officially form my team.

**Acceptance Criteria:**
- [ ] Founder decides when team is complete (don't wait for every role to be filled)
- [ ] Founder clicks "Form Team" button
- [ ] Team created in MongoDB with: Name, founder, members (array), created_date
- [ ] All accepted candidates linked to team
- [ ] Team status = "Active"
- [ ] Both founder and candidates see team dashboard
- [ ] Founder can view team members and their roles
- [ ] Team ID created for future features (chat, tasks, etc.)

**Definition of Done:**
- Endpoint: `POST /api/teams` (create team from idea + accepted invitations)
- Endpoint: `GET /api/teams/:id` (view team)
- Endpoint: `GET /api/teams` (list user's teams)
- Team data model: ID, Name, Founder, Members (array), Status, Created

---

### F6: Dashboards & Discovery

#### F6.1 Founder Dashboard
**Description:** Founder sees their ideas, analyses, and teams.

**User Story:**
> As a founder, I want a dashboard showing my startup ideas, analysis results, and teams.

**Acceptance Criteria:**
- [ ] Dashboard shows: My Ideas (list with status)
- [ ] Dashboard shows: AI Analyses completed
- [ ] Dashboard shows: Pending invitations sent (status, candidate names)
- [ ] Dashboard shows: My Teams (list with member count)
- [ ] Can click on idea to re-edit or re-analyze
- [ ] Can click on team to view members and details
- [ ] Shows action items: "Analyze this idea", "Send invitations", "Form team"

**Definition of Done:**
- Frontend: Dashboard component at `/dashboard`
- Consumes: Ideas, Analyses, Invitations, Teams endpoints
- Responsive and mobile-friendly

---

#### F6.2 Candidate Discovery
**Description:** Candidates can browse startups looking for team members.

**User Story:**
> As a candidate, I want to see startup ideas recruiting teams so I can discover opportunities.

**Acceptance Criteria:**
- [ ] View list of active recruitment (ideas in "Looking for team" state)
- [ ] Filter by domain, tech stack, team stage
- [ ] View startup pitch and required roles
- [ ] View invitations I've received
- [ ] View teams I've joined
- [ ] Search by startup keywords

**Definition of Done:**
- Frontend: Discovery/Browse page at `/discover`
- Endpoint: `GET /api/ideas/open?domain=X&skills=Y` (discovery search)
- Responsive design

---

## Quality Attributes

### Accessibility
- All forms have clear labels and error messages
- Mobile-responsive design (works on phone, tablet, desktop)
- Keyboard-navigable

### Performance
- Page load: <3 seconds
- API responses: <500ms
- Search queries: <1 second

### Security
- [ ] Sanitize all user inputs (prevent injection)
- [ ] Validate authentication on all endpoints
- [ ] Verify user owns data before returning (no data leakage)
- [ ] Secure Firebase config (no keys in frontend code)
- [ ] CORS configured for expected domains

### Reliability
- API errors return meaningful messages
- Graceful degradation if AI service fails
- Fallback candidates if matching fails

---

## User Stories by Priority

### Must-Have (MVP Critical Path)
1. **F1.2** Founder profile creation
2. **F1.3** Candidate profile creation (seed with test data)
3. **F2.1** Create startup idea
4. **F3.1** AI analyze idea → extract roles/skills
5. **F4.1** Search candidates by skills
6. **F4.2** Calculate match score
7. **F4.3** Display ranked matches
8. **F5.1** Send invitation
9. **F5.2** Accept/decline invitation
10. **F5.3** Form team
11. **F6.1** Founder dashboard
12. **F6.2** Candidate discovery

### Nice-to-Have (v1.1+)
- Candidate profile completeness scoring
- Startup idea scoring/validation
- Advanced filtering (AND/OR logic for skills)
- Team communication / chat
- Rejection reasons / feedback
- Analytics dashboard
- Email notifications
- Rate/review matches

---

## Definition of Done (Phase-Level)

Each phase completes when:
- [ ] All stories in scope are implemented
- [ ] Code is tested (unit tests for business logic)
- [ ] All endpoints return correct response format
- [ ] Error cases handled and tested
- [ ] No console errors or warnings
- [ ] Database schema matches implementation
- [ ] Manual end-to-end flow tested with real data
- [ ] Acceptance criteria for each story verified

---

## Rollout / Success Criteria

**V1 MVP Success:**
- ✅ A founder can complete full flow: Create idea → AI analyzes → See matches → Invite → Form team
- ✅ A candidate profile can be discovered and matched
- ✅ At least 3 end-to-end flows tested manually
- ✅ No critical bugs blocking the flow
- ✅ Deployment-ready code

---

**Approval:** ✅ Ready for ROADMAP creation
