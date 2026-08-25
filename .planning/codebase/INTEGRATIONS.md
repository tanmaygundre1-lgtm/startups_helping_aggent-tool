# External Integrations

**Analysis Date:** 2026-08-25

## Authentication & Identity

**Primary Auth Provider:**
- Firebase Authentication (dual implementation)
  - Client-side: Firebase SDK 12.17.1 (`frontend/src/config/firebase-config.js`)
  - Server-side: Firebase Admin SDK 14.2.0 (`backend/config/firebaseAdmin.js`)
  - Auth method: Email/password and Google OAuth

**Google OAuth:**
- Provider: Google Authentication
- Implementation: `frontend/src/services/authService.js`
- Flow: Popup-based login with forced account selection
- Custom parameter: `prompt: "select_account"` in `GoogleAuthProvider` setup
- Error handling: Custom error messages for popup-closed, cancelled, and blocked scenarios

**Firebase Project:**
- Project ID: `innercollegestartupnetwork`
- Auth domain: `innercollegestartupnetwork.firebaseapp.com`
- Storage bucket: `innercollegestartupnetwork.firebasestorage.app`
- Messaging sender ID: `306401185578`

**Authorization:**
- Backend auth middleware: `backend/middleware/authMiddleware.js`
- Token validation: Firebase ID token validation via Authorization header (`Bearer {token}`)
- Protected endpoints: `/api/users/sync`, `/api/auth/me`

## Data Storage

**Primary Database:**
- MongoDB 7.5.0
  - Connection via Mongoose 9.9.3
  - URI: `process.env.MONGODB_URI`
  - Database name: `process.env.MONGODB_DATABASE_NAME`
  - Connection logic: `backend/config/db.js`

**Data Models:**
- `User` model (`backend/models/User.js`)
  - Stores user profile data (name, email, profile image)
  - Nested schemas: college, location, skills with custom validation
- `Idea` model (`backend/models/Idea.js`)
  - Startup/project ideas with metadata
- `Match` model (`backend/models/Match.js`)
  - Relationship tracking between users and ideas

**File Storage:**
- Storage bucket: Firebase Cloud Storage (`innercollegestartupnetwork.firebasestorage.app`)
- Current usage: Profile images via Firebase photoURL

**Caching:**
- Persistence: Browser localStorage via `browserLocalPersistence` in Firebase Auth (`frontend/src/config/firebase-config.js`)
- No Redis or memcached integration detected

## APIs & External Services

**Backend API:**
- Endpoint: `http://localhost:5000/api` (development) or `VITE_API_URL` environment variable
- Base configuration: `frontend/src/services/api.js`

**API Endpoints:**

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|-----------------|
| `/api/users/sync` | POST | Synchronize Firebase user with MongoDB | Firebase Bearer token |
| `/api/health` | GET | Health check | None |
| `/api/auth/me` | GET | Get current authenticated user info | Firebase Bearer token |

**HTTP Client Setup:**
- Client: Axios 1.19.0 (`frontend/src/services/api.js`)
- Headers: Authorization bearer tokens automatically included
- Error handling: Authentication success but sync failure detection (`authService.js`)

## Authentication Flow

**Sign-Up / Email Registration:**
1. Frontend calls `firebase/auth.createUserWithEmailAndPassword()`
2. Frontend calls backend `/api/users/sync` with Firebase ID token
3. Backend validates token via Firebase Admin SDK
4. Backend creates/updates MongoDB User document

**Google Login:**
1. Frontend initiates `signInWithPopup()` with `GoogleAuthProvider`
2. Google OAuth popup displays (forced account selection)
3. Google returns user credentials to Firebase
4. Frontend calls backend `/api/users/sync` with Firebase ID token
5. Backend creates/updates MongoDB User document
6. Error handling: Distinguishes between auth failure and sync failure

**Session Persistence:**
- Method: Browser localStorage via Firebase `browserLocalPersistence`
- Auto-login: Firebase automatically restores session on app reload
- Logout: `firebase/auth.signOut()`

## Environment Configuration

**Required Environment Variables:**

**Backend (.env):**
```
PORT=5000
MONGODB_URI=mongodb+srv://[user]:[password]@[cluster].mongodb.net/
MONGODB_DATABASE_NAME=[database-name]
FIREBASE_PROJECT_ID=innercollegestartupnetwork
FIREBASE_CLIENT_EMAIL=[service-account-email]
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:5000/api
```

**Secrets Location:**
- `.env` files (development - never committed)
- GitHub Secrets or CI/CD vault (production)
- Firebase Console for project credentials

**DNS Configuration:**
- Backend uses Cloudflare DNS servers (1.1.1.1, 1.0.0.1) for MongoDB connections
- Set in `backend/config/db.js`: `dns.setServers(['1.1.1.1', '1.0.0.1'])`
- Purpose: Reliable DNS resolution for MongoDB Atlas connections

## Webhooks & Callbacks

**Firebase Callbacks:**
- Auth state change listener: Implicit in Firebase SDK initialization
- User persistence: Browser storage callback via `ensureAuthPersistence()`

**HTTP Callbacks:**
- None detected (one-way REST API calls only)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, etc.)

**Logging:**
- Backend: Console logging
  - Connection logs: `backend/config/db.js` (with connection string redaction)
  - Server startup: `backend/server.js`
  - Query errors: Mongoose error logging
- Frontend: Browser console (no dedicated logging service)

**Health Monitoring:**
- Health check endpoint: `GET /api/health`
- Returns: `{ status: "ok", message: "Backend is running" }`

## Development & Testing Integration

**Testing Framework:**
- None configured (package.json shows placeholder test command)

**CI/CD:**
- None detected in codebase

**GitHub Integrations:**
- None detected (no Actions, webhooks, or GitHub API usage)

## Security Considerations

**Authentication Security:**
- Firebase ID tokens used for request validation
- Tokens sent via Authorization header with Bearer scheme
- Token validation occurs on protected endpoints via Firebase Admin SDK

**Data Security:**
- Environment variables for sensitive credentials (FIREBASE_PRIVATE_KEY, MONGODB_URI)
- Connection string redaction in logs (regex pattern in `backend/config/db.js`)

**CORS Policy:**
- CORS enabled on backend via `cors` package
- Current config: Default (allows all origins) — should be restricted in production

## External Dependencies Summary

| Service | Purpose | Status |
|---------|---------|--------|
| Firebase | Authentication & cloud storage | ✓ Active |
| Google OAuth | Social login | ✓ Active |
| MongoDB | Database | ✓ Active |
| Cloudflare | DNS resolution | ✓ Active (configured) |
| Node.js ecosystem | Runtime & package distribution | ✓ Active |

---

*Integration audit: 2026-08-25*
