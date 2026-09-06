# Codebase Structure

**Analysis Date:** 2026-08-25

## Directory Layout

```
research_project/
├── backend/                    # Express.js REST API server
│   ├── config/                 # Configuration modules (database, Firebase)
│   ├── controllers/            # Business logic for route handlers
│   ├── middleware/             # Express middleware (authentication)
│   ├── models/                 # Mongoose schema definitions
│   ├── routes/                 # API endpoint definitions
│   ├── server.js               # Express server entry point
│   ├── test-dns.js             # DNS testing utility
│   ├── .env                    # Environment variables (secrets)
│   ├── package.json            # Backend dependencies
│   └── package-lock.json       # Locked versions
│
├── frontend/                   # React + Vite SPA
│   ├── src/                    # Source code
│   │   ├── config/             # Configuration (Firebase)
│   │   ├── services/           # Service modules (auth, API)
│   │   ├── assets/             # Static assets
│   │   ├── App.jsx             # Main React component
│   │   ├── main.jsx            # React DOM mount point
│   │   ├── App.css             # Styles
│   │   └── index.css           # Global styles
│   ├── public/                 # Static files served as-is
│   ├── index.html              # HTML entry point
│   ├── vite.config.js          # Vite build configuration
│   ├── eslint.config.js        # Linting rules
│   ├── package.json            # Frontend dependencies
│   ├── package-lock.json       # Locked versions
│   └── README.md               # Frontend documentation
│
├── .github/                    # GitHub configuration
├── .planning/                  # Planning and documentation
│   └── codebase/               # Codebase analysis (this file)
├── .gitignore                  # Git ignore rules
├── package.json                # Root monorepo manifest
├── package-lock.json           # Root lock file
└── graphify-out/               # Code analysis output (generated)
```

## Directory Purposes

**backend:**

- Purpose: Express.js REST API server with user management and data sync
- Contains: Server code, controllers, middleware, database models, configuration
- Key files: `server.js` (entry point), `routes/userRoutes.js` (API), `config/db.js` (database)

**backend/config:**

- Purpose: Centralized configuration for database and external services
- Contains: `db.js` (MongoDB connection), `firebaseAdmin.js` (Firebase Admin SDK)
- Key files: Setup and initialization code; no business logic

**backend/controllers:**

- Purpose: Route handler logic; processes requests and returns responses
- Contains: `userController.js` with user sync/upsert business logic
- Key files: Functions called by route handlers; coordinate models and validation

**backend/middleware:**

- Purpose: Express middleware for cross-cutting concerns
- Contains: `authMiddleware.js` for Firebase token verification
- Key files: Functions that process requests before reaching handlers

**backend/models:**

- Purpose: Mongoose schema definitions for MongoDB collections
- Contains: `User.js`, `Idea.js`, `Match.js` with embedded schemas
- Key files: Schema definitions only; no business logic

**backend/routes:**

- Purpose: API endpoint definitions and HTTP verb mappings
- Contains: `userRoutes.js` with route handlers and middleware chains
- Key files: Route definitions mapping to controllers

**frontend:**

- Purpose: React SPA (Single Page Application) built with Vite
- Contains: React components, services, configuration, styles
- Key files: `src/App.jsx` (main component), `src/main.jsx` (entry point)

**frontend/src/config:**

- Purpose: Application configuration modules
- Contains: `firebase-config.js` with Firebase client initialization
- Key files: Single-source-of-truth for Firebase and external service config

**frontend/src/services:**

- Purpose: Reusable logic for API communication and authentication
- Contains: `authService.js` (login/logout), `api.js` (HTTP client)
- Key files: Service modules consumed by components

**frontend/src/assets:**

- Purpose: Static assets imported by components (images, fonts, etc.)
- Contains: Image files, SVGs, etc.
- Key files: None currently present

**frontend/public:**

- Purpose: Static files served as-is by Vite dev server and bundler
- Contains: favicon, robots.txt, manifest.json (if present)
- Key files: Copied verbatim to dist on build

## Key File Locations

**Entry Points:**

- `backend/server.js`: Backend HTTP server initialization; listens on port 5000 by default
- `frontend/src/main.jsx`: Frontend React DOM mount; requires `index.html`
- `frontend/index.html`: HTML shell for React app

**Configuration:**

- `backend/config/db.js`: MongoDB connection setup with DNS and error handling
- `backend/config/firebaseAdmin.js`: Firebase Admin SDK initialization with service account
- `frontend/src/config/firebase-config.js`: Firebase client SDK initialization
- `vite.config.js`: Build tool configuration for frontend
- `eslint.config.js`: Linting rules for frontend

**Core Logic:**

- `backend/controllers/userController.js`: User sync/upsert logic (line 5-80)
- `backend/middleware/authMiddleware.js`: Firebase token verification (line 6-28)
- `backend/routes/userRoutes.js`: Route definitions for `/api/users/*`
- `frontend/src/App.jsx`: Main React component with auth state management
- `frontend/src/services/authService.js`: Google login, email auth, logout flows
- `frontend/src/services/api.js`: Axios HTTP client with bearer token injection

**Data Models:**

- `backend/models/User.js`: User profile schema with embedded college, location, skills
- `backend/models/Idea.js`: Startup idea schema with AI analysis metadata
- `backend/models/Match.js`: User-idea match schema with scoring

**Testing:**

- `backend/test-dns.js`: Standalone DNS testing utility

## Naming Conventions

**Files:**

- Controllers: `[entity]Controller.js` (e.g., `userController.js`)
- Routes: `[entity]Routes.js` (e.g., `userRoutes.js`)
- Models: PascalCase (`User.js`, `Idea.js`, `Match.js`)
- Services: `[name]Service.js` (e.g., `authService.js`)
- Config: `[service]-config.js` (e.g., `firebase-config.js`)
- Middleware: `[concern]Middleware.js` (e.g., `authMiddleware.js`)

**Directories:**

- Backend logical layers: lowercase plural (`config/`, `controllers/`, `middleware/`, `models/`, `routes/`)
- Frontend source: lowercase plural (`config/`, `services/`, `assets/`)
- React components: PascalCase (e.g., `App.jsx`)
- Utilities: camelCase (e.g., `api.js`, `authService.js`)

## Where to Add New Code

**New Feature:**

- Backend route logic: `backend/routes/[feature]Routes.js` (define endpoints) + `backend/controllers/[feature]Controller.js` (implement)
- Frontend UI: `frontend/src/components/[FeatureName].jsx` (new directory needed)
- Shared models: `backend/models/[Entity].js`

**New Component/Module:**

- React component: `frontend/src/components/[ComponentName]/` with `[ComponentName].jsx` + CSS
- Backend middleware: `backend/middleware/[concern]Middleware.js`
- Backend configuration: `backend/config/[service].js` if initializing external service

**Utilities and Helpers:**

- Frontend utility functions: `frontend/src/utils/` (create if not present) + `[name].js`
- Backend utility functions: `backend/utils/` (create if not present) + `[name].js`
- Shared helpers: `backend/helpers/` or `frontend/src/helpers/`

**Tests:**

- Backend tests: `backend/__tests__/[unit|integration]/[file].test.js` (create if not present)
- Frontend tests: `frontend/src/__tests__/[component|service]/[name].test.js` (create if not present)

## Special Directories

**node_modules:**

- Purpose: npm dependencies for each workspace
- Generated: Yes (via `npm install`)
- Committed: No (gitignored)

**.git:**

- Purpose: Version control history
- Generated: Yes (via `git init`)
- Committed: N/A (git metadata)

**.planning:**

- Purpose: Project planning and analysis artifacts
- Generated: Partially (codebase analysis, some docs auto-generated)
- Committed: Yes

**graphify-out:**

- Purpose: Knowledge graph and code analysis output
- Generated: Yes (via graphify tool)
- Committed: No (gitignored)

**.env files:**

- Purpose: Environment variables and secrets
- Generated: Manually by developer
- Committed: No (gitignored for security)

## Cross-Module Dependencies

**Frontend Dependencies:**

- `frontend/src/App.jsx` → `frontend/src/config/firebase-config.js` (Firebase auth)
- `frontend/src/App.jsx` → `frontend/src/services/authService.js` (login/logout)
- `frontend/src/services/authService.js` → `frontend/src/services/api.js` (user sync)
- `frontend/src/services/authService.js` → `frontend/src/config/firebase-config.js` (auth client)
- `frontend/src/services/api.js` → `frontend/src/config/firebase-config.js` (get current user)

**Backend Dependencies:**

- `backend/server.js` → `backend/config/db.js` (connect at startup)
- `backend/server.js` → `backend/routes/userRoutes.js` (mount routes)
- `backend/server.js` → `backend/middleware/authMiddleware.js` (for /api/auth/me endpoint)
- `backend/routes/userRoutes.js` → `backend/middleware/authMiddleware.js` (protect /sync endpoint)
- `backend/routes/userRoutes.js` → `backend/controllers/userController.js` (handler)
- `backend/controllers/userController.js` → `backend/models/User.js` (queries and updates)
- `backend/middleware/authMiddleware.js` → `backend/config/firebaseAdmin.js` (verify token)

**Cross-Boundary (Frontend ↔ Backend):**

- HTTP REST API at `http://localhost:5000/api/`
- Frontend calls `POST /api/users/sync` with Firebase ID token in Authorization header
- Backend routes user sync requests to controller via middleware verification

## Module Load Order

**Backend Startup Sequence:**

1. `backend/server.js` entry point
2. Load environment variables via dotenv
3. Import configuration modules: `config/firebaseAdmin.js` (validates env vars)
4. Import routes: `routes/userRoutes.js`
5. Setup Express middleware (JSON parser, CORS)
6. Mount routes at `/api/users`
7. Call `connectToDatabase()` from `config/db.js`
8. MongoDB connection established via Mongoose
9. Express listens on port (awaiting requests)

**Frontend Runtime Sequence:**

1. `frontend/src/main.jsx` entry point
2. React createRoot mounts to #root element in HTML
3. `frontend/src/App.jsx` component renders
4. useEffect hook initializes Firebase auth listener
5. Firebase config (`firebase-config.js`) loaded (SDK initialized)
6. Auth state changes trigger `onAuthStateChanged()` callback
7. Components can now call authService functions

## Critical Paths Through Codebase

**User Login → Sync → Profile Path:**

```
frontend/src/App.jsx:handleLogin()
  → frontend/src/services/authService.js:loginWithGoogle()
  → Firebase popup auth
  → frontend/src/services/authService.js:authenticateAndSync()
  → frontend/src/services/api.js:syncCurrentUser()
  → POST /api/users/sync (HTTP)
  → backend/routes/userRoutes.js:POST /sync
  → backend/middleware/authMiddleware.js (verify token)
  → backend/controllers/userController.js:syncCurrentUser()
  → backend/models/User.js (findOne + upsert)
  → MongoDB user document created/updated
  → Response back to frontend
  → frontend/src/App.jsx (state update)
  → Render authenticated UI
```

**Health Check Path:**

```
Client
  → GET /api/health (HTTP)
  → backend/server.js:app.get('/api/health')
  → Immediate response (no auth required)
  → Client receives status
```

## Import Patterns

**Backend (CommonJS):**

```javascript
// Configuration loading
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Local module imports
const connectToDatabase = require("./config/db");
const authenticateUser = require("./middleware/authMiddleware");
const userRoutes = require("./routes/userRoutes");

// Module exports
module.exports = connectToDatabase;
module.exports = router;
```

**Frontend (ES Modules):**

```javascript
// React and external libraries
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";

// Local module imports
import { auth } from "./config/firebase-config";
import { loginWithGoogle } from "./services/authService";
import api from "./services/api";

// Export functions
export const syncCurrentUser = async (firebaseUser) => { ... };
export default api;
```

## Config and Secrets

**Backend Configuration Sources:**

- `process.env` variables loaded from `.env` file via dotenv
- Required variables: `MONGODB_URI`, `MONGODB_DATABASE_NAME`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `PORT` (optional)
- See `backend/config/db.js` and `backend/config/firebaseAdmin.js` for validation

**Frontend Configuration Sources:**

- `import.meta.env.VITE_*` from Vite environment (loaded from `.env`, `.env.local`, `.env.production`, etc.)
- Example: `import.meta.env.VITE_API_URL` for backend API base URL (defaults to `http://localhost:5000/api`)
- Firebase config is hardcoded in `frontend/src/config/firebase-config.js` (public keys only)

---

_Structure analysis: 2026-08-25_
