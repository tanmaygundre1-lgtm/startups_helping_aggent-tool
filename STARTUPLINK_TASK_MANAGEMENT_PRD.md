# StartupLink Task Management Module — PRD

**Version:** 1.0  
**Status:** APPROVED / Ready for phased implementation  
**Product:** StartupLink  
**Frontend:** React + Vite + AG Grid  
**Backend:** Node.js + Express  
**Database:** MongoDB + Mongoose  
**Authentication:** Existing Firebase Authentication  
**Source of Truth:** MongoDB  
**Future Integration:** Google Sheets  

---

## 1. Executive Summary

StartupLink's next capability is a team task-management workspace. The experience should look and feel like an Excel-style grid while behaving like a secure application.

The core architecture is:

```text
React + AG Grid
      ↓
Express API
      ↓
MongoDB
      ↓
Task / Team / User business rules
```

**AG Grid is the UI. MongoDB is the source of truth.**

Google Sheets is a future integration/reporting/synchronization layer, not the application's database.

Communication/Chat remains **PENDING** and is outside this module.

---

## 2. Product Context

StartupLink's existing journey is:

```text
Idea
 ↓
Enhance / Clarify
 ↓
AI Analysis
 ↓
Required Roles & Skills
 ↓
Candidate Matching
 ↓
Invitation
 ↓
Team Formation
```

This module extends it to:

```text
Team Formation
 ↓
Task Management
 ↓
Task Execution
 ↓
Review
 ↓
Completion
 ↓
Project Progress
```

The existing Team model is the natural parent of tasks. Tasks must not become an unrelated global resource.

---

# 3. Goals

1. Give founders a spreadsheet-like task workspace.
2. Allow authorized team members to execute assigned work.
3. Persist every meaningful edit through the backend.
4. Make failed edits safely revert in the UI.
5. Support backend-controlled task assignment.
6. Enforce a controlled task status lifecycle.
7. Track completion evidence.
8. Calculate meaningful project progress.
9. Maintain auditability and concurrency protection.
10. Prepare the architecture for future Google Sheets integration.
11. Preserve all existing StartupLink functionality.

---

# 4. Non-Goals / Out of Scope for MVP

- Chat or direct messaging
- WebSocket/Socket.IO real-time collaboration
- AI-generated tasks
- AI task assignment
- Google Sheets as a database
- Calendar integration
- Email notifications
- Gantt charts
- Kanban board
- Time tracking
- Complex task dependencies
- Full file-storage system
- Automatic employee-specific Google Sheet tabs

These can be future features.

---

# 5. User Roles

## Founder

Can, subject to backend authorization:

- Create tasks
- Assign/reassign tasks
- Set deadlines
- Set priority
- Edit task information
- Review evidence
- Approve completion
- View team progress
- View task activity
- Delete tasks where permitted

## Candidate / Team Member

Can, subject to backend authorization:

- View authorized team tasks
- View assigned tasks
- Update permitted execution fields
- Start work
- Submit work for review
- Add completion evidence
- View relevant task history

A candidate must not be able to change team ownership, idea ownership, membership, or protected task fields.

---

# 6. AG Grid UX

The first grid has five visible primary columns:

1. Employee Name
2. Task
3. Deadline
4. Completion Evidence
5. Status

Example:

```text
Employee   Task              Deadline   Evidence       Status
----------------------------------------------------------------
Rahul      Login API         Oct 8      GitHub PR      COMPLETED
Priya      Dashboard         Oct 10     -              IN_PROGRESS
Amit       Testing           Oct 12     -              TODO
```

The database can contain more fields than the grid exposes.

The frontend must use **React + AG Grid**, not a separate HTML/JS application, because StartupLink already uses React/Vite.

---

# 7. Task Data Model

Conceptual Mongoose model:

```js
{
  _id,
  teamId,
  ideaId,

  title,
  description,

  assignedTo,

  deadline,
  completionEvidence,
  status,

  priority,
  estimatedHours,

  createdBy,
  updatedBy,

  version,

  createdAt,
  updatedAt
}
```

### Identity rule

Do **not** store employee identity only as a name.

Use:

```text
assignedTo → User._id
```

The frontend displays the user's name.

### Team relationship

Every task must belong to a valid `teamId` and should retain the associated `ideaId` where required by the existing domain model.

---

# 8. Status Workflow

Allowed statuses:

```text
TODO
IN_PROGRESS
IN_REVIEW
COMPLETED
BLOCKED
SKIPPED
```

Primary workflow:

```text
TODO
 ↓
IN_PROGRESS
 ↓
IN_REVIEW
 ↓
COMPLETED
```

Other valid transitions may include:

```text
IN_PROGRESS → BLOCKED
BLOCKED → IN_PROGRESS
TODO → SKIPPED
```

The backend owns transition validation.

`COMPLETED` represents approved completion; a candidate should not simply bypass review when the product workflow requires founder approval.

---

# 9. Completion Evidence

Initial MVP may store a string URL/reference:

```text
completionEvidence: String
```

Examples:

- GitHub PR
- GitHub commit
- Figma URL
- Deployment URL
- Documentation URL
- Screenshot/reference URL

Future versions may use structured evidence:

```js
[
  { type, url, label }
]
```

External URLs must be validated by the backend.

---

# 10. Task Creation & Auto Assignment

Founder creates a task with an optional assignee.

If no assignee is supplied, the backend automatically chooses an eligible team member.

Initial deterministic strategy:

1. Load active team members.
2. Filter by required/appropriate role where applicable.
3. Calculate active workload.
4. Choose the lowest workload.
5. Use a deterministic tie-breaker.
6. Persist the assignment.

Example:

```text
Rahul → 5 active tasks
Priya → 2 active tasks
Amit  → 1 active task

New task → Amit
```

Do **not** use AI for the initial assignment algorithm.

Future versions can consider availability, skills, deadlines, and estimated hours.

---

# 11. API Contract — Proposed

The exact route names must be checked against the current repository and backend conventions before implementation. The following are proposed Task resource operations, not existing APIs:

```http
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

Optional future operations:

```http
GET  /api/tasks/:id
GET  /api/tasks/:id/activity
POST /api/tasks/:id/evidence
```

## GET /api/tasks

Returns tasks only for teams/projects the authenticated user is authorized to access.

Never return every task in the database and rely on React to filter unauthorized data.

## POST /api/tasks

Backend must:

1. Authenticate the user.
2. Verify team access.
3. Validate input.
4. Verify team/idea relationship.
5. Assign a member if needed.
6. Create the task.
7. Record activity where applicable.
8. Return the created task.

## PATCH /api/tasks/:id

Purpose: update only the modified field(s).

Example:

```json
{ "status": "IN_PROGRESS" }
```

Use MongoDB `$set` for partial updates.

PATCH must whitelist editable fields. Protected fields such as `_id`, `teamId`, `ideaId`, `createdBy`, ownership and authorization information cannot be arbitrarily changed.

## DELETE /api/tasks/:id

Only authorized users may delete a task. The exact deletion/soft-delete policy should follow existing backend conventions.

---

# 12. Optimistic AG Grid Editing

When a cell changes:

```text
User edits cell
 ↓
AG Grid shows new value immediately
 ↓
onCellValueChanged
 ↓
PATCH /api/tasks/:id
 ↓
Backend validation
 ↓
MongoDB $set
```

On success:

```text
Keep value
Show Saved state
```

On failure:

```text
Restore old value
Show error
```

The frontend must preserve:

- task ID
- field
- old value
- new value

for deterministic rollback.

Recommended UI states:

```text
Saving...
Saved ✓
Failed — Reverted
```

---

# 13. Concurrency / Version Protection

Multiple users may edit the same task.

The model should include a version mechanism:

```text
version: Number
```

Conceptually:

```text
Client version = 7
Database version = 7
 → update succeeds
 → database version = 8
```

If:

```text
Client version = 7
Database version = 8
```

the backend should reject or flag the stale update instead of silently overwriting newer data.

---

# 14. Authorization & Security

All Task APIs must use StartupLink's existing authentication mechanism.

Backend must verify:

- Authenticated identity
- Team membership/ownership
- Task ownership/access
- Allowed role
- Allowed field updates
- Valid referenced user/team/idea

Frontend hiding a button is not authorization.

Backend authorization is mandatory.

Other requirements:

- Validate ObjectIds
- Validate request bodies
- Whitelist PATCH fields
- Validate status transitions
- Validate external URLs
- Do not log authentication tokens
- Do not expose secrets
- Apply rate limits where appropriate

---

# 15. Audit Trail

Create a future/initial `TaskActivity` collection for accountability.

Conceptual document:

```js
{
  taskId,
  userId,
  type,
  field,
  oldValue,
  newValue,
  createdAt
}
```

Examples:

```text
Rahul changed status:
TODO → IN_PROGRESS

Tanmay changed deadline:
Oct 8 → Oct 10

Priya submitted completion evidence
```

The audit trail must be generated by the backend, not trusted from arbitrary frontend input.

---

# 16. Progress Calculation

Initial calculation:

```text
completed tasks
---------------- × 100
 total tasks
```

Preferred future calculation:

```text
completed estimated hours
-------------------------- × 100
total estimated hours
```

Example:

```text
Task A = 2h
Task B = 8h
Task C = 10h

Completed = B

Progress = 8 / 20 × 100
         = 40%
```

Progress is derived from backend data. React must not be the authoritative calculator.

---

# 17. Google Sheets Integration Strategy

Google Sheets is an integration layer, not the database.

```text
                 StartupLink
                     |
          +----------+----------+
          |                     |
       MongoDB              AG Grid
   Source of Truth             UI
          |
          |
   Google Integration
          |
     Google Sheets
```

MongoDB owns:

- User identity
- Team membership
- Authorization
- Task identity
- Business rules
- Status rules
- Audit information

Google Sheets may provide:

- External planning
- Reporting
- Collaboration
- Import/export
- Synchronized task views

Google Sheets must never control:

- Team membership
- User identity
- Permissions
- Idea ownership
- StartupLink authorization

---

# 18. Future Google Sheets Phases

After the core task system is stable:

### A. Google OAuth

Secure user-authorized Google access.

### B. Spreadsheet discovery

List accessible spreadsheets and allow selection.

### C. Read-only integration

Read spreadsheet metadata, tabs, headers and rows.

### D. StartupLink → Sheet

Write approved task data to the selected sheet.

### E. One-way synchronization

```text
StartupLink → Google Sheets
```

### F. Controlled two-way synchronization

```text
StartupLink ↔ Google Sheets
```

### G. Conflict detection

Use stable `taskId`, timestamps/version information and explicit conflict handling.

---

# 19. Future Real-Time Collaboration

Real-time multi-user updates are not an MVP requirement.

MVP:

```text
AG Grid → PATCH → MongoDB
```

Future:

```text
User A
 ↓
PATCH
 ↓
MongoDB
 ↓
Realtime event
 ↓
User B's AG Grid
```

Technology choice (WebSocket, Socket.IO, SSE, etc.) should be made later based on actual requirements and existing infrastructure.

---

# 20. Frontend Architecture

Follow the existing StartupLink React/Vite architecture.

Conceptual organization:

```text
frontend/src/
  pages/
  components/tasks/
  api/tasks.js
  services/tasks/
  utils/
```

Do not create a standalone HTML/JS application.

The task page should consume an API/service layer rather than placing raw Axios calls throughout UI components.

AG Grid requirements:

- React AG Grid integration
- Stable column definitions
- `getRowId`
- Task `_id` as row identity
- `onCellValueChanged`
- Optimistic editing
- PATCH only changed field
- Rollback on failure
- Save/error feedback

---

# 21. Validation

### Title
Required and trimmed.

### Deadline
Valid date when supplied.

### Status
Must be a defined enum value.

### Assigned User
Must be a valid member of the task's team.

### Team
Must exist and be accessible.

### Idea
Must correspond to the team where required.

### Evidence
Valid format and reasonable length.

### Estimated Hours
Positive when supplied.

---

# 22. Database Indexing

Consider indexes based on actual query patterns for:

```text
teamId
ideaId
assignedTo
status
deadline
```

Compound indexes should be introduced only when supported by real query patterns.

---

# 23. Testing Requirements

## Unit

- Task validation
- Status transitions
- Assignment algorithm
- Progress calculation
- PATCH whitelist
- Version/conflict logic

## API

- GET tasks
- POST task
- PATCH task
- DELETE task
- Validation failures
- Database failures

## Authorization

- Founder
- Authorized team member
- Non-member
- Unauthenticated user

## Frontend

- Grid loading
- Cell edit
- PATCH request
- Successful persistence
- Failed persistence
- Rollback
- Task creation
- Auto assignment
- Status changes

## Browser E2E

```text
Login
 ↓
Open Team
 ↓
Open Task Workspace
 ↓
Load tasks
 ↓
Create task
 ↓
Auto assignment
 ↓
Edit cell
 ↓
PATCH succeeds
 ↓
Refresh
 ↓
Value persists
```

Failure E2E:

```text
Edit cell
 ↓
PATCH fails
 ↓
Cell reverts
 ↓
Error appears
```

---

# 24. Phase-wise Implementation Plan

## Phase 0 — Repository Audit & Architecture Freeze

**Goal:** Understand the existing code before changing it.

Tasks:

- Inspect frontend structure.
- Inspect backend structure.
- Inspect Team/User models.
- Inspect auth middleware.
- Inspect API/service conventions.
- Inspect Team pages/routes.
- Check AG Grid dependency.
- Search for existing task code.
- Confirm current backend API contract.

**Exit:** Task integration points are known; no duplicate architecture is introduced.

---

## Phase 1 — Task Domain & Database

**Goal:** Create the task domain.

Tasks:

- Task Mongoose model
- `teamId`
- `ideaId`
- title/description
- `assignedTo`
- deadline
- evidence
- status enum
- priority
- estimated hours
- createdBy/updatedBy
- version
- timestamps
- appropriate indexes

**Exit:** Task documents validate and persist correctly.

---

## Phase 2 — Secure Task API

**Goal:** Implement the Task resource.

Tasks:

- GET tasks
- POST task
- PATCH task
- DELETE task if required
- Existing auth middleware
- Authorization
- Validation
- `$set` partial updates
- Error handling

**Exit:** Authenticated API operations work and unauthorized access is rejected.

---

## Phase 3 — Auto Assignment

**Goal:** Backend automatically assigns unassigned tasks.

Tasks:

- Identify eligible team members
- Role filtering
- Active workload calculation
- Lowest-workload selection
- Deterministic tie-breaker
- Persist assignment

**Exit:** An unassigned task receives a predictable valid team member.

---

## Phase 4 — AG Grid MVP

**Goal:** Display real tasks in a spreadsheet-style interface.

Tasks:

- AG Grid React integration
- Five visible columns
- `getRowId`
- Load tasks through API layer
- Display assigned user's name
- Deadline renderer/editor
- Evidence display
- Status display

**Exit:** Real MongoDB-backed tasks appear correctly in the grid.

---

## Phase 5 — Optimistic Editing

**Goal:** Make cell editing reliable.

Tasks:

- `onCellValueChanged`
- Capture old/new values
- PATCH only changed field
- Save state
- Success handling
- Rollback on failure
- User-facing error

**Exit:** Successful edits survive refresh; failed edits revert correctly.

---

## Phase 6 — Task Creation UX

**Goal:** Let founders create tasks.

Tasks:

- Add Task action
- Creation form
- Validation
- Optional assignee
- Auto assignment
- Insert returned task into grid
- Error handling

**Exit:** Founder can create an unassigned task and see backend assignment.

---

## Phase 7 — Execution Workflow

**Goal:** Make task execution meaningful.

Tasks:

- Status transitions
- Candidate execution workflow
- Evidence submission
- IN_REVIEW
- Founder approval
- COMPLETED

**Exit:** Task moves through the approved lifecycle without invalid transitions.

---

## Phase 8 — Security Hardening

**Goal:** Enforce permissions at the backend.

Tasks:

- Founder permissions
- Candidate permissions
- Team membership checks
- PATCH field restrictions
- Protected field restrictions
- Input validation
- Consistent errors

**Exit:** A user cannot access or modify tasks outside their authorization.

---

## Phase 9 — Audit & Progress

**Goal:** Add accountability and project visibility.

Tasks:

- TaskActivity model
- Record field changes
- Record status changes
- Backend progress calculation
- Team progress UI
- Activity UI where useful

**Exit:** The system can explain important task changes and calculate progress.

---

## Phase 10 — Concurrency Protection

**Goal:** Prevent silent overwrites.

Tasks:

- Version field
- Optimistic concurrency checks
- Stale-update response
- Conflict UI
- Refresh/retry behavior

**Exit:** Concurrent edits cannot silently overwrite newer data.

---

## Phase 11 — Google Sheets Integration

**Goal:** Connect task data to Google Sheets without changing the source of truth.

Sub-phases:

1. Google Cloud project
2. Sheets API
3. Drive API
4. OAuth consent
5. OAuth credentials
6. Backend OAuth flow
7. Secure connection storage
8. Spreadsheet discovery
9. Spreadsheet selection
10. Tab selection
11. Read-only preview
12. StartupLink → Sheet write
13. One-way sync
14. Controlled two-way sync
15. Conflict detection

**Exit:** Authorized teams can synchronize approved task data while MongoDB remains authoritative.

---

## Phase 12 — Production Hardening

**Goal:** Make the module deployment-ready.

Tasks:

- Environment configuration
- Secret management
- Structured logging
- Error monitoring
- Rate limiting
- Retry strategy
- Timeouts
- Database indexes
- API documentation
- Security review
- E2E testing
- Deployment verification
- Backup/recovery considerations

**Exit:** Module is stable, secure, testable, observable and deployable.

---

# 25. Implementation Order

Do not implement all phases at once.

```text
Phase 0
  ↓
Phase 1
  ↓
Phase 2
  ↓
Phase 3
  ↓
Phase 4
  ↓
Phase 5
  ↓
Phase 6
  ↓
Phase 7
  ↓
Phase 8
  ↓
Phase 9
  ↓
Phase 10
  ↓
Phase 11
  ↓
Phase 12
```

Each phase must be tested and verified before the next phase begins.

---

# 26. Definition of Done

The Task Management Module is complete only when:

- Tasks are stored in MongoDB.
- Tasks belong to valid StartupLink teams.
- Authorized users can access them.
- Unauthorized users cannot access them.
- AG Grid loads real backend data.
- Five required columns work.
- `getRowId` uses stable task identity.
- Cell edits trigger PATCH.
- Backend performs partial `$set` updates.
- Failed saves rollback.
- Task creation works.
- Auto assignment works.
- Status workflow is enforced.
- Completion evidence works.
- Progress is backend-derived.
- Activity history exists.
- Concurrency protection exists.
- Unit/API/frontend/E2E tests pass at the agreed level.
- Browser verification passes.
- Google Sheets architecture is documented and does not replace MongoDB as source of truth.
- Existing StartupLink functionality is not broken.

---

# 27. Non-Regression Rule

Do not modify unrelated functionality.

Do not change the existing:

- Idea analysis scoring
- Candidate matching formula
- Invitation behavior
- Team ownership rules
- Firebase authentication architecture
- Existing dashboard behavior

unless the Task module directly requires a change.

Reuse existing components, authentication middleware, API clients, design tokens, layouts and backend conventions wherever possible.

Never invent an API that is assumed to already exist. If a new endpoint is required, implement it, document it, and verify it.

---

# 28. Product Success Criteria

A founder should be able to complete this journey:

```text
Open Team
 ↓
Open Task Workspace
 ↓
Create Task
 ↓
Backend Assigns Employee
 ↓
Task Appears in AG Grid
 ↓
Edit Deadline / Status / Evidence
 ↓
Changes Persist
 ↓
Candidate Executes Task
 ↓
Candidate Submits Evidence
 ↓
Founder Reviews
 ↓
Task Becomes COMPLETED
 ↓
Project Progress Updates
```

Future integration:

```text
StartupLink Task System
        ↓
Google Sheets Integration
        ↓
External Planning / Reporting
```

MongoDB remains the authoritative source throughout.
