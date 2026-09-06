# Backend Architecture Audit

## 1. Project Overview

StartupLink V1 backend, an API-first Node.js Express application.

## 2. Folder Structure

- `config/`: Database, Firebase, and taxonomies configuration.
- `controllers/`: Request handling logic & business processes.
- `middleware/`: Auth, request validation.
- `models/`: Mongoose schemas.
- `routes/`: API endpoint definitions.
- `services/`: Reusable business logic (e.g., scoring).
- `test/`: Unit and integration tests.

## 3. Server Architecture

Entry point: `server.js` initializes imports, connects to MongoDB, and starts the listener on `process.env.PORT` (default 5000). Exports the app via `app.js`.

## 4. Request Lifecycle

Request
→ Route (`routes/`)
→ Middleware (`middleware/authMiddleware.js`, etc.)
→ Controller (`controllers/`)
→ Model/Service (`models/` or `services/`)
→ Response

## 5. Authentication Architecture

Uses `firebase-admin` to verify ID tokens in the `Authorization: Bearer <token>` header within `authMiddleware.js`.

## 6. User Architecture

- `User` model: `firebaseUid` (unique), `email`, `profileType` ('founder' | 'candidate'), `skills`, `targetRoles`, `domainInterests`.

## 7. Profile Architecture

- Shared user model handles profile data.
- Completion flag: `profileCompleted`.

## 8. API Inventory

_(To be detailed in BACKEND_API_CONTRACT.md)_

## 9. Database Architecture (Mongoose)

- `Match`, `Invitation`, `Team`, `Idea`, `User`, `Analysis`.
- Uses transactions for team formation.

## 10. Startup Idea Architecture

- `Idea` model: `createdBy`, `aiAnalysis` (inline).

## 11. Skills / Domains / Matching

- `services/matchScoring.js`: Deterministic scoring.

## 12. Problems or Risks Found

- Testing gaps (see previous UAT).
- Integration mismatch (already addressed partially in fix-plan).

---
