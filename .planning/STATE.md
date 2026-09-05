# STATE.md — StartupLink Project State

**Last Updated:** 2026-09-05  
**Phase:** Phase 2 - Matching Engine & Invitations  
**Workflow Status:** Wave 1 (02-01 matching engine) complete; ready for Wave 2 (invitations)

---

## Current State

### ✅ Completed

- [x] Codebase analysis and mapping
- [x] PROJECT.md / REQUIREMENTS.md / ROADMAP.md
- [x] Phase 1 backend foundation + Gemini integration
- [x] Phase 1 UAT verification
- [x] Phase 2 research and plans (02-01, 02-02, 02-03)
- [x] Phase 2 Wave 1: deterministic matching engine + ranked snapshots

### 🔄 In Progress

- [ ] Phase 2 Wave 2: invitation lifecycle (02-02)
- [ ] Phase 2 Wave 3: team formation (02-03)

### 📋 Upcoming

- [ ] Phase 3 frontend UI
- [ ] Final verification and deployment prep

---

## Key Decisions Made

| Decision | Value | Rationale |
| --- | --- | --- |
| Primary User | Idea Founders | Most acute pain point |
| V1 Scope | End-to-end flow | Tight 2-week timeline |
| AI Provider | Vercel AI SDK + Gemini | Structured output, existing Phase 1 contract |
| Matching weights | 40/15/15/15/15 | Locked F4.2 formula, scoringVersion v1 |
| Match identity | `{ ideaId, userId }` | One snapshot per idea/candidate |
| Availability fallback | 0.5 unknown | Idea has no hours/work-mode requirement |

---

## Context for Next Phase

### Preserve Phase 1 + Wave 1 contracts

- User model uses `firebaseUid`
- Ideas use `createdBy`
- AI analysis stays inline in `Idea.aiAnalysis`
- Matching requires `Idea.aiAnalysis.isApproved === true`
- Do not create a second candidate model
- Do not modify frontend for remaining Phase 2 waves unless explicitly planned

### Next Command

`/gsd-execute-phase 2 --wave 2` (or execute `02-02-PLAN.md` invitation lifecycle)

---

## Artifacts Generated

| Artifact | Location | Purpose |
| --- | --- | --- |
| PROJECT.md | `.planning/PROJECT.md` | Vision and constraints |
| ROADMAP.md | `.planning/ROADMAP.md` | Phase breakdown |
| Phase 2 research | `.planning/phases/02-matching-engine-invitations/02-RESEARCH.md` | Matching/invitation design |
| Wave 1 summary | `.planning/phases/02-matching-engine-invitations/02-01-SUMMARY.md` | Completed matching engine |
| STATE.md | `.planning/STATE.md` | This file |
