# Phase 1 Backend Testing Checklist

## Setup

- [ ] Copy `.env.example` to `.env` and configure MongoDB, Firebase, and AI credentials.
- [ ] Run `npm install` from `backend/`.
- [ ] Start the API with `npm start`.
- [ ] Confirm `GET http://localhost:5000/api/health` returns `{ "status": "ok" }`.
- [ ] Optional: run `node scripts/seedData.js` to create representative records.

## Authentication and profiles

- [ ] `POST /api/users/sync` creates or updates the authenticated Firebase user.
- [ ] `GET /api/users/profile` returns the authenticated profile.
- [ ] `PUT /api/users/profile` persists founder or candidate profile fields.
- [ ] `POST /api/users/profile` creates a founder profile for a new Firebase user.
- [ ] `POST /api/users/candidate-profile` creates a candidate profile for a new Firebase user.
- [ ] Requests without a Bearer token return `401`.

## Ideas

- [ ] `POST /api/ideas` creates an idea owned by the authenticated user.
- [ ] `GET /api/ideas` lists only the authenticated founder's ideas.
- [ ] `GET /api/ideas/:ideaId` returns a valid idea.
- [ ] `PUT /api/ideas/:ideaId` updates only an owned idea.
- [ ] `DELETE /api/ideas/:ideaId` deletes an unapproved idea.
- [ ] Invalid IDs return `400`; non-owners receive `403`.
- [ ] Missing title or a description shorter than 20 characters returns `400`.

## AI analysis

- [ ] `POST /api/ideas/:ideaId/analyze` returns structured roles, skills, tech stack, and team size.
- [ ] `GET /api/ideas/:ideaId/analysis` returns the owner's analysis.
- [ ] `PUT /api/ideas/:ideaId/analysis` saves founder edits or approval.
- [ ] AI failures restore the idea to `draft` and return a controlled error.

## Discovery

- [ ] `POST /api/users/candidates/search` returns only completed candidate profiles.
- [ ] `GET /api/ideas/discover` returns only approved, discoverable ideas.

## Persistence

- [ ] Restarting the backend does not remove records.
- [ ] Seed records are linked to the expected founder and idea.
- [ ] MongoDB indexes are created from the model definitions.
