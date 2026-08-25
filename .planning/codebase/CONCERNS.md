# Codebase Concerns

**Analysis Date:** 2026-08-25

## Security Considerations

### Exposed Firebase API Key

**Risk:** Critical - Firebase API key is hardcoded and publicly exposed in frontend source code.

**Files:** `frontend/src/config/firebase-config.js` (lines 1-14)

**Current mitigation:** None - key is directly accessible to anyone viewing source code

**Recommendations:** 
- Move Firebase config to environment variables
- Use `VITE_FIREBASE_*` prefix for env vars
- Regenerate exposed API key immediately
- Implement Firebase security rules to restrict client-side access

### Unrestricted CORS Configuration

**Risk:** High - Backend accepts requests from any origin, enabling CSRF attacks

**Files:** `backend/server.js` (line 13)

**Current mitigation:** None - `cors()` allows all origins

**Recommendations:**
- Restrict CORS to specific frontend domain(s)
- Use `cors({ origin: process.env.FRONTEND_URL })`
- Implement CSRF tokens for state-changing operations

### No Input Validation

**Risk:** High - User input is not validated or sanitized before database operations

**Files:** `backend/controllers/userController.js`, `backend/routes/userRoutes.js`

**Current mitigation:** Minimal MongoDB schema validation

**Recommendations:**
- Add request validation middleware (joi, zod, or express-validator)
- Validate email format, URL format for profile images
- Sanitize string inputs (trim, length limits)
- Implement schema validation for all POST/PUT requests

### No Rate Limiting

**Risk:** Medium - API endpoints have no rate limiting, allowing brute force attacks and DoS

**Files:** `backend/server.js`, `backend/routes/userRoutes.js`

**Current mitigation:** None

**Recommendations:**
- Implement rate limiting middleware (express-rate-limit)
- Set limits per IP and per user (e.g., 100 requests/15min)
- Apply stricter limits to auth endpoints

### Token Refresh Not Implemented

**Risk:** Medium - Firebase ID tokens expire but no refresh mechanism exists

**Files:** `frontend/src/services/api.js`, `frontend/src/services/authService.js`

**Current mitigation:** Token fetched on each request, but errors not handled

**Recommendations:**
- Implement interceptor to detect 401 responses
- Refresh token automatically before expiry
- Handle refresh failures with logout

## Performance Bottlenecks

### Missing Database Indexes

**Risk:** Medium - Complex queries on large datasets will be slow

**Files:** `backend/models/Idea.js`, `backend/models/Match.js`, `backend/models/User.js`

**Current mitigation:** Limited indexes defined; only `_id`, `firebaseUid`, and compound index on Match model

**Recommendations:**
- Add index on `Idea.createdBy` for user profile queries
- Add index on `Idea.category` for filtering
- Add index on `Match.userId` for match listings
- Add composite index on `(userId, status)` for status filtering
- Monitor query performance with MongoDB profiler

### No Caching Layer

**Risk:** High - Every frontend request queries database directly, no caching

**Files:** All API endpoints

**Current mitigation:** None

**Recommendations:**
- Implement Redis for user profiles and idea listings
- Cache match results with TTL (5-15 minutes)
- Cache user skills and interests
- Add cache invalidation on data changes

### N+1 Query Risk in Match Scoring

**Risk:** Medium - Scoring matches may require multiple database queries

**Files:** `backend/models/Match.js` (matchScore field)

**Current mitigation:** None - implementation not visible

**Recommendations:**
- Use MongoDB aggregation pipeline for complex scoring
- Pre-compute and cache match scores
- Implement batch processing for match generation

### No Pagination

**Risk:** High - Listing all ideas/matches without pagination causes memory and performance issues

**Files:** `backend/routes/userRoutes.js` (only sync endpoint exposed)

**Current mitigation:** Unknown - endpoints not yet implemented

**Recommendations:**
- Add `limit` and `offset` query parameters to list endpoints
- Set reasonable defaults (limit=20, max=100)
- Implement cursor-based pagination for large datasets
- Add sorting options

## Scalability Concerns

### Single Server Architecture

**Risk:** High - No horizontal scaling, single point of failure

**Files:** `backend/server.js`

**Current mitigation:** None

**Recommendations:**
- Containerize backend (Docker)
- Deploy behind load balancer
- Separate read replicas for reporting
- Implement session store for multi-server deployment

### Database Connection Pooling

**Risk:** Medium - No visible connection pool configuration in Mongoose

**Files:** `backend/config/db.js`

**Current mitigation:** Mongoose default pool size (5)

**Recommendations:**
- Configure explicit pool size: `maxPoolSize: 10` for production
- Monitor connection count under load
- Implement connection timeout and retry logic

### No Async Job Queue

**Risk:** Medium - Long-running tasks (AI analysis, match scoring) will block requests

**Files:** `backend/models/Idea.js` (aiAnalysis exists but functionality unknown)

**Current mitigation:** None

**Recommendations:**
- Implement job queue (Bull, RabbitMQ, or AWS SQS)
- Move AI analysis to background jobs
- Move bulk match scoring to async tasks
- Add job status tracking and retry logic

## Test Coverage Gaps

### No Unit Tests

**Risk:** High - No safety net for refactoring or regression detection

**Files:** Entire backend (`backend/`)

**Current mitigation:** None

**Recommendations:**
- Add Jest for unit testing
- Target 80%+ coverage for critical paths
- Test authentication middleware
- Test user sync logic with edge cases (duplicate users, missing fields)
- Test error handling

### No Integration Tests

**Risk:** High - API endpoints untested end-to-end

**Files:** All backend API routes

**Current mitigation:** None - manual `test-dns.js` file present but incomplete

**Recommendations:**
- Add supertest for API integration testing
- Test full auth flow (Firebase token → user sync)
- Test duplicate user handling
- Test error responses (400, 401, 409, 500)

### No Frontend Tests

**Risk:** Medium - UI logic untested, no regression detection

**Files:** `frontend/src/`

**Current mitigation:** None

**Recommendations:**
- Add Vitest + React Testing Library
- Test auth flow and error states
- Test logout functionality
- Test loading and error UI states

## Logging & Monitoring

### Insufficient Logging

**Risk:** Medium - Production issues difficult to diagnose

**Files:** `backend/config/db.js`, `backend/server.js`, `backend/controllers/userController.js`

**Current mitigation:** Basic console.log statements

**Recommendations:**
- Replace console.log with structured logging (Winston or Pino)
- Add request logging middleware with correlation IDs
- Log auth attempts with IP and timestamp
- Log all database errors with full context

### No Error Tracking

**Risk:** High - Production errors not tracked or alerted

**Files:** Entire backend

**Current mitigation:** None

**Recommendations:**
- Integrate Sentry for error tracking
- Capture stack traces and context
- Set up alerts for critical errors
- Track error frequency and patterns

### No Observability

**Risk:** Medium - No metrics, tracing, or health monitoring

**Files:** `backend/server.js` (basic health check exists)

**Current mitigation:** `/api/health` endpoint only

**Recommendations:**
- Add Prometheus metrics (request counts, latency, errors)
- Implement distributed tracing (Jaeger or Datadog)
- Add database query metrics
- Track Firebase auth failures

## Architectural Issues

### Limited API Surface

**Risk:** Medium - Only user sync endpoint implemented, feature incomplete

**Files:** `backend/routes/userRoutes.js`

**Current mitigation:** None

**Recommendations:**
- Implement idea CRUD endpoints (create, read, list, update, delete)
- Implement match list endpoint with filters
- Implement match accept/reject endpoints
- Add user profile update endpoint
- Add user search endpoint

### No API Documentation

**Risk:** Medium - Frontend devs cannot self-serve API usage

**Files:** All API routes

**Current mitigation:** None

**Recommendations:**
- Add OpenAPI/Swagger documentation
- Document all endpoints, request/response schemas
- Document error codes and messages
- Generate client SDK from OpenAPI spec

### AI Analysis Feature Incomplete

**Risk:** High - aiAnalysis schema exists but no implementation visible

**Files:** `backend/models/Idea.js` (lines 8-16)

**Current mitigation:** None

**Recommendations:**
- Clarify if AI analysis is computed or user-supplied
- If computed: implement external AI service integration
- Add async job processing for AI analysis
- Add error handling for failed analyses

### Match Algorithm Not Documented

**Risk:** High - matchScore calculation logic not visible or documented

**Files:** `backend/models/Match.js` (line 16)

**Current mitigation:** None

**Recommendations:**
- Document scoring algorithm
- Implement match generation logic
- Test scoring with sample data
- Add tuning parameters to config

## Configuration & Deployment

### Hardcoded API URL

**Risk:** Medium - Frontend cannot work with different backend URLs

**Files:** `frontend/src/services/api.js` (line 3)

**Current mitigation:** Fallback to `http://localhost:5000/api`

**Recommendations:**
- Set `VITE_API_URL` environment variable for production
- Document required env vars for deployment
- Add `.env.example` file with all required vars

### Missing Environment Documentation

**Risk:** High - Developers don't know what env vars are required

**Files:** Project root

**Current mitigation:** None

**Recommendations:**
- Create `.env.example` in both backend and frontend
- Document all required environment variables
- Document default values
- Add setup guide in README

### No Containerization

**Risk:** Medium - Deployment process unclear, inconsistent environments

**Files:** Project root

**Current mitigation:** None

**Recommendations:**
- Add Dockerfile for backend
- Add docker-compose for local development
- Add .dockerignore to exclude node_modules

### No CI/CD Pipeline

**Risk:** High - Manual deployment process, no automated testing

**Files:** Project root

**Current mitigation:** None

**Recommendations:**
- Add GitHub Actions workflow
- Run tests on every PR
- Build Docker images on merge
- Deploy to staging/production environment

## Dependencies & Versions

### Mixed Module Systems

**Risk:** Low - Backend uses CommonJS, frontend uses ESM (inconsistent)

**Files:** `backend/` uses `require()`, `frontend/` uses `import`

**Current mitigation:** Works but inconsistent

**Recommendations:**
- Migrate backend to ESM for consistency
- Use `"type": "module"` in backend package.json
- Update all imports to ESM style

### Major Version Dependencies

**Risk:** Medium - Using Express 5.2.1 (major version) may introduce breaking changes

**Files:** `backend/package.json`

**Current mitigation:** No lock file tracked in git

**Recommendations:**
- Review Express 5.x breaking changes from 4.x
- Add package-lock.json or yarn.lock to git
- Pin versions with `^` or `~` appropriately
- Automate dependency updates (Dependabot)

### No Backend Linting

**Risk:** Medium - Backend has no ESLint, style inconsistencies

**Files:** `backend/`

**Current mitigation:** Frontend has ESLint configured

**Recommendations:**
- Add ESLint to backend with shared config
- Add Prettier for code formatting
- Add pre-commit hooks (husky)
- Run linter in CI/CD

## Data & Models

### No Password Requirements

**Risk:** Medium - Email/password auth not yet implemented, but will need validation

**Files:** Not yet implemented (only OAuth)

**Current mitigation:** Currently using only Google OAuth

**Recommendations:**
- Add password validation (min 8 chars, complexity)
- Hash passwords with bcrypt (cost=12)
- Implement password reset flow

### No Email Verification

**Risk:** Medium - Email-based features assume verified emails

**Files:** Not yet implemented

**Current mitigation:** Google OAuth handles verification

**Recommendations:**
- Implement email verification flow when email signup is added
- Send verification tokens via email
- Require verification before certain features

### No Data Retention Policy

**Risk:** Low - Unclear how long data is kept, GDPR implications

**Files:** All models

**Current mitigation:** None

**Recommendations:**
- Add `deletedAt` soft-delete field to models
- Implement data retention policy (e.g., 2 years)
- Add background job to hard-delete old data
- Document GDPR compliance approach

## Frontend Architecture

### No Routing

**Risk:** High - Single page, cannot support multi-page app

**Files:** `frontend/src/App.jsx`

**Current mitigation:** None

**Recommendations:**
- Implement React Router v7 navigation
- Add pages for user profile, idea list, matches
- Add routing structure to handle future features

### No State Management

**Risk:** Medium - Props drilling will become problematic at scale

**Files:** `frontend/src/App.jsx` (state in root component)

**Current mitigation:** Currently limited to root component

**Recommendations:**
- Evaluate state management (Context API, Zustand, or Redux)
- Implement user state store
- Implement API data store

### No Type Safety

**Risk:** Medium - No TypeScript, prone to type-related bugs

**Files:** `frontend/src/` (all .jsx files)

**Current mitigation:** None

**Recommendations:**
- Migrate to TypeScript
- Add tsconfig.json
- Enable strict mode
- Add type definitions for API responses

### Limited Error Handling

**Risk:** Medium - Errors not consistently handled or displayed

**Files:** `frontend/src/App.jsx`

**Current mitigation:** Basic error message display

**Recommendations:**
- Create error boundary component
- Add error toast notifications
- Implement error recovery flows
- Add retry logic for failed requests

## Technical Debt

### User Sync Logic Mixes Concerns

**Risk:** Medium - Authentication and user data sync tightly coupled

**Files:** `backend/controllers/userController.js`

**Current mitigation:** None

**Recommendations:**
- Extract user sync to separate service class
- Separate validation from sync logic
- Add unit tests for sync edge cases

### Duplicate User Handling Race Condition

**Risk:** Medium - Concurrent logins could create duplicate users

**Files:** `backend/controllers/userController.js` (lines 25-33)

**Current mitigation:** Catches duplicate key error but not foolproof

**Recommendations:**
- Add transaction or unique constraint at application level
- Use MongoDB session transactions
- Add integration test for concurrent logins

### Error Messages Expose Details

**Risk:** Medium - Generic error messages should hide implementation details

**Files:** `backend/controllers/userController.js` (line 68)

**Current mitigation:** Somewhat generic, but MongoDB errors could leak info

**Recommendations:**
- Implement error translation layer
- Log full errors internally, return generic messages to client
- Never expose database schema or internal details

### No Request ID Tracking

**Risk:** Medium - Difficult to trace requests through logs

**Files:** All API handlers

**Current mitigation:** None

**Recommendations:**
- Generate UUID for each request
- Pass request ID through logs and error tracking
- Return request ID in error responses

## Known Limitations

### Match Scoring Algorithm Unknown

**Risk:** High - Business logic for core feature not documented or visible

**Files:** `backend/models/Match.js`

**Impact:** Cannot verify correctness, maintain, or optimize

**Recommendation:** Document algorithm immediately; prioritize implementation

### AI Analysis Feature Status Unknown

**Risk:** High - Core feature status unclear

**Files:** `backend/models/Idea.js`

**Impact:** Cannot plan around this feature

**Recommendation:** Clarify scope (build, buy, defer); document requirements

### No Bulk Operations Support

**Risk:** Medium - Cannot efficiently create multiple matches or ideas

**Files:** Not yet implemented

**Impact:** Performance issues at scale

**Recommendation:** Add batch endpoint for bulk operations

---

*Concerns audit: 2026-08-25*
