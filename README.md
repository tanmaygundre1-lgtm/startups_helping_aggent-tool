# StartupLink Local Setup

This repository contains a Node.js backend and a React + Vite frontend that work together for the StartupLink app.

## Architecture

- Backend: Express + MongoDB + Mongoose + Firebase Admin auth
- Frontend: React + Vite + Firebase client auth + React Router
- Package manager: npm
- Backend port: 5000
- Frontend port: 5173
- Database: MongoDB with environment-based connection strings
- Authentication: Firebase web client + Firebase Admin backend
- AI integration: Google/OpenAI/Anthropic via the Vercel AI SDK
- Realtime chat: Socket.IO over the backend HTTP server

## Requirements

- Node.js 18 or newer (LTS recommended)
- npm available in PATH
- Access to a MongoDB instance
- Firebase project credentials for both frontend and backend

## Quick start

1. Clone the repository.
2. From the project root, run:

```bash
npm run setup
```

3. Fill in the required values in [backend/.env](backend/.env) if they were created from the template. Do not overwrite an existing file.
4. Start both apps together:

```bash
npm run dev
```

## What the setup script does

The root setup command:

- validates the local Node.js/npm environment
- installs backend dependencies from the existing project lock file when available
- installs frontend dependencies using the repo's existing lock file when available
- creates [backend/.env](backend/.env) from [backend/.env.example](backend/.env.example) only if it does not already exist
- prints the environment values you still need to fill in
- keeps all project configuration intact and is safe to rerun

## Environment notes

The backend configuration is defined by [backend/.env.example](backend/.env.example). The keys you typically need to set include:

- PORT
- MONGODB_URI
- MONGODB_DATABASE_NAME
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- AI_PROVIDER
- AI_MODEL
- GOOGLE_GENERATIVE_AI_API_KEY
- FRONTEND_URL or FRONTEND_ORIGIN (recommended in deployed environments for Socket.IO CORS)

The frontend currently uses a Firebase web configuration embedded in [frontend/src/config/firebase-config.js](frontend/src/config/firebase-config.js). There is no frontend .env.example in this repo at the moment.

## Realtime chat deployment

Team chat uses Socket.IO at the same origin and port as the Express backend. The backend must run as a persistent Node.js HTTP process using `server.js`; do not deploy the websocket endpoint as a short-lived serverless function.

For a deployed frontend, set `FRONTEND_URL` or `FRONTEND_ORIGIN` on the backend to the exact frontend origin so Socket.IO CORS accepts the browser connection. Set `VITE_SOCKET_URL` on the frontend when the websocket server is hosted at a different origin; otherwise it derives the socket URL from `VITE_API_URL` by removing `/api`.

If a reverse proxy or load balancer sits in front of the backend, it must forward HTTP upgrade requests for `/socket.io/` and allow long-lived websocket connections. When running multiple backend instances, configure sticky sessions or a shared Socket.IO adapter such as Redis; the current implementation is intended for one backend instance and does not synchronize rooms across processes.

The client loads message history through the authenticated REST API on first load and after reconnecting, so websocket reconnects do not require trusting client-side room state.

## Manual validation

You can validate the repository after setup with:

```bash
npm run validate
```

This checks that the expected backend and frontend package scripts are still present.

## Local app URLs

Once both services are running:

- Backend health check: http://localhost:5000/api/health
- Frontend: http://localhost:5173
