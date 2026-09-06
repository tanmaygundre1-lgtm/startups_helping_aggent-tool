# Technology Stack

**Analysis Date:** 2026-08-25

## Languages

**Primary:**

- JavaScript (Node.js) - Backend server and database operations
- JavaScript (React/JSX) - Frontend application

**Version Targeting:**

- Node.js: Compatible with ES2024 features via CommonJS (backend) and ES modules (frontend)
- No explicit TypeScript usage

## Runtime

**Environment:**

- Node.js (backend execution runtime)
- Browser (modern ES6+ compatible - frontend)

**Package Manager:**

- npm (primary package manager)
- Lockfile: Standard npm format (package-lock.json expected)

## Frameworks

**Core Backend:**

- Express 5.2.1 - HTTP server and API framework (`backend/server.js`)
- Used for RESTful API endpoints

**Core Frontend:**

- React 19.2.8 - UI library and component framework (`frontend/src/`)
- React DOM 19.2.8 - React rendering for web (`frontend/src/main.jsx`)
- React Router DOM 7.18.2 - Client-side routing (`frontend/package.json`)

**Build & Development:**

- Vite 8.2.0 - Frontend bundler and dev server (`frontend/vite.config.js`)
- Vite React Plugin 6.0.4 - JSX transformation for Vite
- Nodemon 3.1.14 - Development auto-reload for backend (`backend/package.json`)

**Code Quality:**

- ESLint 10.8.0 - JavaScript linting (`frontend/eslint.config.js`)
- ESLint JS Config 10.0.1 - Base recommended rules
- ESLint React Hooks Plugin 7.1.1 - React-specific lint rules
- ESLint React Refresh Plugin 0.5.3 - Vite refresh compatibility checks

## Database & Persistence

**Primary Database:**

- MongoDB 7.5.0 - Document-oriented NoSQL database
  - Connection via Mongoose ORM
  - Configured via `MONGODB_URI` and `MONGODB_DATABASE_NAME` environment variables (`backend/config/db.js`)
  - DNS configured to use Cloudflare servers (1.1.1.1, 1.0.0.1)

**ORM/Query Layer:**

- Mongoose 9.9.3 - MongoDB object modeling
  - Schemas defined in `backend/models/` (User.js, Idea.js, Match.js)
  - Connection logic in `backend/config/db.js`

## HTTP & Communication

**Frontend HTTP Client:**

- Axios 1.19.0 - Promise-based HTTP client (`frontend/src/services/api.js`)
  - Base URL: `VITE_API_URL` environment variable or `http://localhost:5000/api`
  - Token-based authentication via `Authorization: Bearer` headers

**Backend HTTP Middleware:**

- CORS 2.8.6 - Cross-Origin Resource Sharing (`backend/server.js`)
- Express 5.2.1 - Built-in JSON body parsing (`express.json()`)

## Key Dependencies

**Critical Libraries:**

| Package        | Version | Purpose                         | Location                          |
| -------------- | ------- | ------------------------------- | --------------------------------- |
| express        | 5.2.1   | REST API server                 | `backend/`                        |
| mongoose       | 9.9.3   | MongoDB ORM                     | `backend/`                        |
| firebase-admin | 14.2.0  | Server-side Firebase auth/admin | `backend/config/firebaseAdmin.js` |
| react          | 19.2.8  | Frontend UI framework           | `frontend/src/`                   |
| vite           | 8.2.0   | Frontend dev server & bundler   | `frontend/`                       |
| firebase       | 12.17.1 | Client-side Firebase SDK        | `frontend/`                       |
| axios          | 1.19.0  | HTTP client                     | `frontend/src/services/api.js`    |
| dotenv         | 17.4.2  | Environment variable management | `backend/` and `frontend/`        |

**Development-Only:**

| Package                     | Version | Purpose                                   |
| --------------------------- | ------- | ----------------------------------------- |
| nodemon                     | 3.1.14  | Auto-restart server on file changes (dev) |
| @types/react                | 19.2.17 | React type definitions for IDE/linting    |
| @types/react-dom            | 19.2.3  | React DOM type definitions                |
| eslint-plugin-react-hooks   | 7.1.1   | Lint rules for React Hooks                |
| eslint-plugin-react-refresh | 0.5.3   | Vite React refresh compatibility          |
| globals                     | 17.7.0  | Global variable definitions for ESLint    |

## Build Configuration

**Frontend Build:**

- Entry point: `frontend/index.html`
- Config file: `frontend/vite.config.js`
- Output: `frontend/dist/` (standard Vite output)
- Commands:
  - `npm run dev` - Start Vite dev server
  - `npm run build` - Production bundle
  - `npm run preview` - Preview production build
  - `npm run lint` - Run ESLint

**Backend Build:**

- Entry point: `backend/server.js`
- No build step required (Node.js directly executes)
- Commands:
  - `npm run start` - Run production server
  - `npm run dev` - Run with nodemon auto-reload

**Module System:**

- Backend: CommonJS (`"type": "commonjs"` in `backend/package.json`)
- Frontend: ES Modules (`"type": "module"` in `frontend/package.json`)

## Environment Configuration

**Configuration Method:**

- Environment variables via `dotenv` 17.4.2 (`backend/config/db.js`, `backend/config/firebaseAdmin.js`)
- Files: `.env`, `.env.local` (not committed)

**Backend Required Variables:**

- `PORT` - Server port (defaults to 5000)
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DATABASE_NAME` - Database name
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Firebase private key (newline escaped)

**Frontend Configuration:**

- `VITE_API_URL` - Backend API base URL (defaults to `http://localhost:5000/api`)

## Development Platform Requirements

**Local Development:**

- Node.js 18+ (CommonJS backend + modern JavaScript)
- npm 8+
- Git

**Production Deployment:**

- Node.js 18+ LTS or later
- MongoDB Atlas or self-hosted MongoDB instance
- Cloudflare DNS access (for MongoDB DNS resolution)

---

_Stack analysis: 2026-08-25_
