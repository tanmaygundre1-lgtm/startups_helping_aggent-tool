# Coding Conventions

**Analysis Date:** 2026-08-25

## Naming Patterns

**Files:**

- Backend controllers: `camelCase` with descriptive suffix (e.g., `userController.js`, `authMiddleware.js`)
- Frontend services: `camelCase` with descriptive purpose (e.g., `authService.js`, `api.js`)
- Config files: kebab-case or camelCase (e.g., `firebase-config.js`, `firebaseAdmin.js`)
- React components: PascalCase (e.g., `App.jsx`)
- Models: PascalCase (e.g., `User.js`, `Idea.js`)
- Schemas: Descriptive with "Schema" suffix (e.g., `collegeSchema`, `locationSchema`)

**Functions:**

- camelCase throughout codebase
- Async functions clearly named to indicate async behavior
- Middleware functions prefixed with function purpose (e.g., `authenticateUser`, `syncCurrentUser`)
- Helper functions descriptive and concise (e.g., `getFirstValue`, `redactConnectionString`)

**Variables:**

- camelCase consistently used
- Boolean variables prefixed with `is` or similar (e.g., `isLoggingIn`, `isLoading`, `authPersistenceReady`)
- Firebase data prefixed with `firebase` (e.g., `firebaseUid`, `firebaseEmail`, `firebaseName`)
- Requested/safe data distinguished (e.g., `requestedName` vs. `safeName`)

**Types/Models:**

- Mongoose schemas: PascalCase for model names (e.g., `User`, `Match`, `Idea`)
- Schema definitions: camelCase with "Schema" suffix (e.g., `collegeSchema`, `skillSchema`, `locationSchema`)

**Constants:**

- Environment variables: UPPERCASE_WITH_UNDERSCORES (e.g., `MONGODB_URI`, `VITE_API_URL`, `MONGODB_DATABASE_NAME`)

## Code Style

**Formatting:**

- ESLint configured for frontend: `frontend/eslint.config.js`
- Rules extend: `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Target formats: JavaScript and JSX files
- Browser globals defined for React environment
- No Prettier configuration found — formatting not explicitly standardized

**Linting:**

- Frontend: ESLint with React plugins enabled
- Backend: No linter configured
- Run frontend linting: `npm run lint` in `frontend/` directory

**Module System:**

- **Backend:** CommonJS using `require()` and `module.exports`
  - Example: `const express = require('express'); module.exports = router;`
  - Located in: `backend/*.js`, `backend/config/*.js`, `backend/controllers/*.js`, etc.
- **Frontend:** ES6 modules using `import` and `export`
  - Example: `import { useState } from 'react'; export const loginWithGoogle = ...`
  - Located in: `frontend/src/**/*.jsx` and `frontend/src/**/*.js`

**Async/Await Pattern:**

- Consistently used throughout both backend and frontend
- Try-catch blocks wrap async operations
- Finally blocks used for cleanup (e.g., resetting loading states, clearing promise locks)
- Example:
  ```javascript
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      setErrorMessage(error.message || "Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };
  ```

## Import Organization

**Backend (CommonJS):**

- External libraries first: `express`, `cors`, `mongoose`, etc.
- Internal configs second: `./config/*`
- Internal middleware/controllers third
- Routes defined with imported middleware
- Example in `backend/server.js`:
  ```javascript
  const express = require("express");
  const cors = require("cors");
  const connectToDatabase = require("./config/db");
  const authenticateUser = require("./middleware/authMiddleware");
  const userRoutes = require("./routes/userRoutes");
  ```

**Frontend (ES6):**

- React hooks first: `import { useState, useEffect } from 'react'`
- Firebase imports second: `import { ... } from 'firebase/auth'`
- Internal services third: `import { ... } from './services/...'`
- Config files fourth: `import { auth } from './config/firebase-config'`
- Styles last: `import './App.css'`

**Path Aliases:**

- No path aliases configured in `tsconfig.json` or vite config
- All imports use relative paths: `./config/`, `../services/`

## Error Handling

**Backend Pattern:**

- Try-catch blocks with structured error logging
- Errors logged to `console.error()` with context object
- Sensitive data redacted before logging (e.g., database connection strings)
- Specific HTTP status codes for different error types:
  - `401` for authentication failures
  - `409` for conflict errors (duplicate key violations)
  - `500` for server errors
- Structured JSON error responses to client:
  ```javascript
  return res.status(409).json({
    success: false,
    message: "A user with these Firebase or email details already exists",
  });
  ```

**Frontend Pattern:**

- Try-catch in async handlers
- Error messages displayed to user via state (`setErrorMessage()`)
- Console logging for development: `console.error('Login failed:', error)`
- User-friendly error messages constructed from error codes:
  ```javascript
  const messages = {
    "auth/popup-closed-by-user": "The Google sign-in popup was closed...",
    "auth/cancelled-popup-request": "A Google sign-in request is already...",
  };
  ```

**Duplicate Key Errors:**

- MongoDB duplicate key error code `11000` handled specially
- Triggered by unique indexes: `firebaseUid`, `email`
- Caught and converted to `409 Conflict` response

## Logging

**Framework:** Native `console` object used throughout

**Backend Patterns:**

- Startup logs: `console.log('Server running on port ${port}')`
- Database connection: `console.log('MongoDB connected to database: ${name}')`
- Error logs with context object: `console.error('MongoDB connection failed:', { name, message, code, reason })`
- Sensitive data automatically redacted via `redactConnectionString()` function in `backend/config/db.js`

**Frontend Patterns:**

- Error logging only: `console.error('Login failed:', error)`
- Service errors tagged: `console.error('[AuthService] Google Login Error:', error)`
- No verbose logging in production paths

## Configuration Management

**Environment Variables:**

- Backend: Loaded via `dotenv.config()` in `backend/config/db.js` and `backend/server.js`
- Frontend: Loaded via Vite `import.meta.env.VITE_*` pattern in `frontend/src/services/api.js`
- Required variables checked before use:
  - Backend: `MONGODB_URI`, `MONGODB_DATABASE_NAME`, `PORT` (optional, defaults to 5000)
  - Frontend: `VITE_API_URL` (optional, defaults to `http://localhost:5000/api`)

**Environment-Specific Handling:**

- DNS server override for MongoDB access: `dns.setServers(['1.1.1.1', '1.0.0.1'])` in `backend/config/db.js`
- Firebase auth persistence set to browser local storage in `frontend/src/config/firebase-config.js`

**Hard-Coded Secrets:**

- ⚠️ Firebase config keys hard-coded in `frontend/src/config/firebase-config.js` (poor practice, should use env vars)

## Comments and Documentation

**JSDoc Comments:**

- Used selectively for exported functions
- Example in `frontend/src/services/authService.js`:
  ```javascript
  /**
   * Logs in a user using Google Authentication via Popup.
   */
  export const loginWithGoogle = async () => { ... }
  ```

**Inline Comments:**

- Used for complex logic or non-obvious patterns
- Example in `frontend/src/App.jsx`:
  ```javascript
  // Listen for login/logout state changes
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
  ```

**No Block Comments:**

- Prefer inline comments or JSDoc for clarity

## Function Design

**Size:**

- Most functions 10-50 lines
- Complex functions broken into smaller helpers (e.g., `getFirstValue()`, `getGoogleLoginError()`)

**Parameters:**

- Consistent parameter order: data/payload first, then options/config
- Destructuring used when appropriate: `{ name, email }`
- Default values used for optional config: `auth.currentUser` default in `syncCurrentUser()`

**Return Values:**

- Express middleware: returns `res.status().json()` or calls `next()`
- Services: return Promise objects (async)
- Helpers: return primitive values or objects
- Error cases: throw Error objects rather than returning null

## Module Design

**Exports:**

- Backend: Single export or named object export
  - `module.exports = { syncCurrentUser }`
  - `module.exports = authenticateUser`
  - `module.exports = router`
- Frontend: Named exports preferred
  - `export const loginWithGoogle = async () => { ... }`
  - `export default api` (Axios instance)

**Barrel Files:**

- Not used in codebase
- All imports use direct file paths

**Module Responsibilities:**

- Controllers handle business logic: `userController.js` = user sync logic
- Middleware handles cross-cutting concerns: `authMiddleware.js` = token verification
- Services handle external API interaction: `authService.js` = Firebase auth
- Models define database schema: `User.js` = User document structure
- Config files load and export initialized services: `firebaseAdmin.js`, `firebase-config.js`

---

_Convention analysis: 2026-08-25_
