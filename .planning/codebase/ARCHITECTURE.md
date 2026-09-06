<!-- refreshed: 2026-08-25 -->

# Architecture

**Analysis Date:** 2026-08-25

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Client Layer (React)                        │
│  `frontend/src/App.jsx` + Auth + Router                          │
├──────────────────────────────────────────────────────────────────┤
│  Firebase Authentication  │  Axios HTTP Client                   │
│  `frontend/src/config/firebase-config.js`  │  `frontend/src/services/api.js`  │
└──────────────────┬────────────────────────────────────────────────┘
                   │
                   │ HTTP/REST
                   │ JWT Bearer Token
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              API Layer (Express.js)                               │
│  `backend/server.js` + Routes + Middleware                        │
│  `backend/routes/userRoutes.js`                                   │
├──────────────────────────────────────────────────────────────────┤
│  Firebase Token Verification  │  Business Logic                  │
│  `backend/middleware/authMiddleware.js`  │  `backend/controllers/userController.js`  │
└──────────────────┬────────────────────────────────────────────────┘
                   │
                   │ Mongoose ODM
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              Data Layer (MongoDB + Mongoose)                      │
│  `backend/config/db.js` - Connection & Models                     │
├──────────────────┬──────────────────┬───────────────────────────┤
│   User Model     │   Idea Model     │    Match Model            │
│  `backend/models/User.js` │  `backend/models/Idea.js` │  `backend/models/Match.js`  │
└──────────────────┴──────────────────┴───────────────────────────┘
```

## Component Responsibilities

| Component       | Responsibility                                                | File                                     |
| --------------- | ------------------------------------------------------------- | ---------------------------------------- |
| App Component   | Main React component, auth state management, UI orchestration | `frontend/src/App.jsx`                   |
| Firebase Config | Firebase client initialization, auth provider setup           | `frontend/src/config/firebase-config.js` |
| Auth Service    | Google login, email signup/login, logout, auth orchestration  | `frontend/src/services/authService.js`   |
| API Service     | HTTP client with base URL, user sync endpoint                 | `frontend/src/services/api.js`           |
| Express Server  | HTTP server setup, routes mounting, middleware registration   | `backend/server.js`                      |
| Auth Middleware | Firebase ID token verification, user injection into request   | `backend/middleware/authMiddleware.js`   |
| Database Config | MongoDB connection, DNS configuration, error handling         | `backend/config/db.js`                   |
| Firebase Admin  | Firebase Admin SDK initialization with service account        | `backend/config/firebaseAdmin.js`        |
| User Routes     | Route definitions for user endpoints                          | `backend/routes/userRoutes.js`           |
| User Controller | Business logic for user sync, upsert, update operations       | `backend/controllers/userController.js`  |
| User Model      | Mongoose schema for user documents with profile data          | `backend/models/User.js`                 |
| Idea Model      | Mongoose schema for startup ideas with AI analysis metadata   | `backend/models/Idea.js`                 |
| Match Model     | Mongoose schema for user-idea matches with scoring            | `backend/models/Match.js`                |

## Pattern Overview

**Overall:** Full-stack microservice architecture with stateless REST API and client-side Firebase authentication

**Key Characteristics:**

- Separation of concerns: frontend (React), backend (Express), database (MongoDB)
- Stateless token-based authentication using Firebase JWT
- Request-response HTTP protocol with bearer token auth
- Single API namespace: `/api/*`
- Server-side persistence via MongoDB with Mongoose ORM
- Cross-origin resource sharing enabled (CORS)

## Layers

**Presentation Layer (React Frontend):**

- Purpose: User interface, client-side authentication, state management
- Location: `frontend/src/`
- Contains: React components, authentication flow, API service layer
- Depends on: Firebase Auth SDK, Axios HTTP client
- Used by: Web browser clients

**API Layer (Express Backend):**

- Purpose: HTTP request handling, route dispatch, authentication verification, business logic
- Location: `backend/`
- Contains: Server setup, route handlers, middleware stack, controllers
- Depends on: Express framework, Firebase Admin SDK, Mongoose ORM
- Used by: Frontend clients via HTTP/REST

**Data Access Layer (Mongoose + MongoDB):**

- Purpose: Data persistence, schema definition, query operations
- Location: `backend/models/` and `backend/config/db.js`
- Contains: Model schemas, connection configuration, database operations
- Depends on: MongoDB database, Mongoose ORM
- Used by: Controllers for CRUD operations

**Authentication Bridge (Firebase):**

- Purpose: Unified authentication across client and server
- Location: `frontend/src/config/firebase-config.js` and `backend/config/firebaseAdmin.js`
- Contains: Firebase client initialization and Firebase Admin initialization
- Depends on: Firebase project configuration, credentials
- Used by: Client auth service and server auth middleware

## Data Flow

### Primary Request Path: User Authentication & Sync

1. User initiates login via Google OAuth button in UI (`frontend/src/App.jsx`)
2. Firebase Auth popup presented, user selects/authenticates account (`frontend/src/config/firebase-config.js`)
3. Client-side `loginWithGoogle()` called, retrieves authenticated user + ID token (`frontend/src/services/authService.js:43`)
4. `authenticateAndSync()` wrapper extracts Firebase token and calls API endpoint
5. Frontend calls `POST /api/users/sync` with token in `Authorization: Bearer {idToken}` header (`frontend/src/services/api.js:10-23`)
6. Axios sends request to backend base URL (from VITE_API_URL or localhost:5000)
7. Express server receives request, routes to `POST /api/users/sync` handler (`backend/server.js:14`)
8. `authenticateUser` middleware extracts token from header and verifies with Firebase Admin SDK (`backend/middleware/authMiddleware.js:14-28`)
9. If valid, decoded user object (uid, email, name, picture) injected into `req.user`
10. Request routed to `syncCurrentUser` controller with authenticated user context (`backend/controllers/userController.js:5-80`)
11. Controller queries MongoDB for existing user by `firebaseUid`
12. If new user: creates document with provided/default data; if existing: updates changed fields
13. Updated user document returned to frontend with 200 status
14. Frontend receives response and updates local state (`frontend/src/App.jsx:15-25`)

### Health Check Flow

1. Frontend or client calls `GET /api/health` (`backend/server.js:16-20`)
2. Server responds with status: ok, no authentication required

### Current User Status Flow

1. Authenticated client calls `GET /api/auth/me` with ID token header (`backend/server.js:22-27`)
2. Auth middleware verifies token
3. Server returns authenticated user's uid and email from decoded token

**State Management:**

- **Frontend**: React useState hooks for user, loading, isLoggingIn states
- **Backend**: Stateless; all user context comes from Firebase token in each request
- **Database**: MongoDB maintains authoritative user record; can sync from multiple logins

## Key Abstractions

**Firebase Authentication Bridge:**

- Purpose: Unified identity across client and server without storing passwords
- Examples: `frontend/src/services/authService.js`, `backend/middleware/authMiddleware.js`, `backend/config/firebaseAdmin.js`
- Pattern: Client obtains JWT token from Firebase; server verifies token with Firebase Admin SDK; no shared session state

**User Sync Pattern:**

- Purpose: Ensure MongoDB user record reflects current Firebase authentication state
- Examples: `syncCurrentUser()` in controller and service
- Pattern: Upsert via firebaseUid; merge Firebase claims with form-submitted data; handle race conditions with unique indexes

**Mongoose Model Composition:**

- Purpose: Reusable embedded schemas for complex data structures
- Examples: `collegeSchema`, `locationSchema`, `skillSchema` embedded in User model
- Pattern: Define shared schema once, embed in parent model with `_id: false` to avoid nested document IDs

## Entry Points

**Backend Entry Point:**

- Location: `backend/server.js`
- Triggers: `npm start` or `npm run dev` from backend folder
- Responsibilities: Initialize Express app, register middleware and routes, connect to MongoDB, start listening on port (from env or 5000)

**Frontend Entry Point:**

- Location: `frontend/src/main.jsx`
- Triggers: `npm run dev` or build-time Vite bundling
- Responsibilities: Mount React app to DOM, initialize root component

**API Routes Entry Point:**

- Location: `backend/routes/userRoutes.js`
- Triggers: Any request to `/api/users/*`
- Responsibilities: Define REST endpoints and map to controllers

## Architectural Constraints

- **Threading:** Node.js event loop; single-threaded with callback-based concurrency for database operations
- **Global state:** Database connection singleton initialized once in `connectToDatabase()` at server startup; Firebase Admin instance singleton in `firebaseAdmin.js`
- **Circular imports:** None detected; acyclic dependency graph
- **Authentication:** Stateless; all requests must include valid Firebase ID token in Authorization header
- **CORS:** Enabled globally on all routes; production deployment should restrict to frontend origin
- **Database transactions:** MongoDB operations via Mongoose are not wrapped in transactions; relies on schema-level uniqueness indexes for consistency (firebaseUid and email)
- **Environment configuration:** All sensitive data (MongoDB URI, Firebase credentials, port) must be in environment variables

## Anti-Patterns

### Hardcoded Firebase Config in Client Code

**What happens:** `frontend/src/config/firebase-config.js` contains Firebase public keys and project IDs directly in source code
**Why it's wrong:** Although Firebase public keys are meant to be public, exposing credentials in git repository can lead to:

- Accidental commits of sensitive service account keys if testing with private config
- Difficulty rotating credentials without code changes
- Exposure of project structure in version control

**Do this instead:** Consider moving non-sensitive Firebase config values (projectId, apiKey, authDomain) to environment files (`.env`) and load via `import.meta.env.VITE_*`. Keep `.env` with sample values in git.

### Synchronous Password/Credential Handling in Error Messages

**What happens:** Auth errors in `frontend/src/services/authService.js` include full error objects that may reference tokens
**Why it's wrong:** If error messages are logged or sent to monitoring, sensitive auth tokens could be exposed

**Do this instead:** Strip token values from error messages before logging; pass only error code and sanitized message to user

### Missing Input Validation in Controller

**What happens:** `syncCurrentUser()` accepts name and profileImage from request body without schema validation
**Why it's wrong:** Even though Firebase token verifies user identity, custom fields bypass validation; no length limits, XSS checks, or type enforcement

**Do this instead:** Use request body schema validator (e.g., Joi, Zod) before processing; validate length, format, and content type

## Error Handling

**Strategy:** Fail-fast with HTTP status codes; Firebase token verification errors block middleware; database errors surface with appropriate status codes

**Patterns:**

- **Authentication failures:** 401 Unauthorized with descriptive message
- **Authorization failures:** 403 Forbidden (not currently implemented)
- **Validation failures:** 400 Bad Request
- **Data conflicts:** 409 Conflict (e.g., duplicate email unique index violation)
- **Server errors:** 500 Internal Server Error with safe, non-leaking message
- **Async/await:** Wrapped in try-catch; errors propagated to Express error handler (via async route handler)

## Cross-Cutting Concerns

**Logging:** Console.log in server startup and database connection; stack traces on errors; no structured logging library (recommend winston or pino for production)

**Validation:** Schema-level validation via Mongoose (required fields, enums, min/max); no request body validation middleware

**Authentication:** Middleware-based Firebase token verification; runs on all protected routes; extracted user attached to `req.user`

**Error Logging:** Database connection errors logged with redacted connection strings (see `redactConnectionString()` in `backend/config/db.js`)

---

_Architecture analysis: 2026-08-25_
