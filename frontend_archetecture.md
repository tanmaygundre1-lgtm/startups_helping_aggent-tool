# Frontend Architecture

This guide describes the active React application in `frontend/src`. It is based on the current entry point, route tree, page imports, auth context, and API clients.

## Stack and Entry Points

- React 19 renders the application; Vite provides the development server and production build.
- React Router v7 provides browser routing.
- Firebase Authentication manages sign-in and the Firebase ID token.
- Axios is the HTTP client used to call the Express API.
- `src/main.jsx` mounts `App` under React `StrictMode` and loads global CSS.
- `src/App.jsx` composes `AuthProvider`, `BrowserRouter`, and `AppRoutes`.

## Application Layers

| Layer                        | Location                                                    | Responsibility                                                                                                |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Bootstrap                    | `src/main.jsx`, `src/App.jsx`                               | Create the React root, initialize auth context, and install browser routing.                                  |
| Route guards and route table | `src/routes/`                                               | Select page components, protect application routes, and redirect signed-in users based on profile completion. |
| Pages                        | `src/pages/`                                                | Own screen-level loading, error, and interaction state; compose shared and domain components.                 |
| Shared UI                    | `src/components/common/`, `src/components/layout/`          | Reusable buttons, cards, badges, status states, navigation, and application shell.                            |
| Domain UI                    | `src/components/matching/`, `src/components/invitations/`   | Candidate cards/modals/composers and invitation cards/details/actions.                                        |
| Auth and profile state       | `src/context/`, `src/hooks/`, `src/services/authService.js` | Synchronize Firebase identity with the backend profile and expose it through `useAuth`.                       |
| API access                   | `src/api/`, `src/services/`                                 | Attach auth tokens, normalize request errors, and group backend calls by resource/workflow.                   |
| Styling                      | `src/index.css`, `src/App.css`                              | Define global tokens, controls, app shell, and shared page styling.                                           |

Most page data is held in component-local React state. `AuthContext` is the shared state source for the Firebase user, backend profile, profile type, loading/error state, and auth actions; there is no separate global data store.

## Route Map

`AppRoutes.jsx` is the canonical client-side route table. `ProtectedRoute` wraps onboarding and `/app` routes. `PublicRoute` controls `/login`. The root route selects login, onboarding, or the app based on auth and profile completion.

| Path                          | Access       | Page                                           | Use                                                                                                                                                  |
| ----------------------------- | ------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                           | Public entry | `RootEntry` in `AppRoutes.jsx`                 | Redirect to login, onboarding, or `/app` according to auth/profile state.                                                                            |
| `/login`                      | Public       | `pages/auth/LoginPage.jsx`                     | Google sign-in. Signed-in users are redirected onward.                                                                                               |
| `/onboarding/welcome`         | Protected    | `pages/onboarding/WelcomePage.jsx`             | Begin profile onboarding.                                                                                                                            |
| `/onboarding/role`            | Protected    | `pages/onboarding/RoleSelectionPage.jsx`       | Select founder or candidate flow.                                                                                                                    |
| `/onboarding/founder`         | Protected    | `pages/onboarding/FounderOnboarding.jsx`       | Collect founder profile details.                                                                                                                     |
| `/onboarding/candidate`       | Protected    | `pages/onboarding/CandidateOnboarding.jsx`     | Collect candidate profile, skills, roles, and availability.                                                                                          |
| `/app`                        | Protected    | `pages/ApplicationEntryPage.jsx`               | Render the Founder or Candidate dashboard from `profileType`.                                                                                        |
| `/app/ideas`                  | Protected    | `pages/dashboard/IdeasPage.jsx`                | List and manage the founder's ideas and resume their workflow.                                                                                       |
| `/app/ideas/create`           | Protected    | `pages/dashboard/CreateIdeaPage.jsx`           | Create an idea.                                                                                                                                      |
| `/app/ideas/:ideaId/raw`      | Protected    | `pages/dashboard/CreateIdeaPage.jsx`           | Edit the raw idea for an existing ID.                                                                                                                |
| `/app/ideas/:ideaId/enhance`  | Protected    | `pages/dashboard/EnhanceIdeaPage.jsx`          | Review and enhance the saved idea.                                                                                                                   |
| `/app/ideas/:ideaId/analysis` | Protected    | `pages/dashboard/AnalyzeIdeaPage.jsx`          | View, edit, and approve analysis and role requirements.                                                                                              |
| `/app/ideas/:ideaId/matching` | Protected    | `pages/dashboard/GenerateTeamPage.jsx`         | Run scored matching, inspect role groups, and invite candidates. An optional `?role=` query focuses the existing generated groups on a missing role. |
| `/app/ideas/:ideaId`          | Protected    | `pages/dashboard/IdeaDetailPage.jsx`           | View the saved idea, analysis, and workflow actions.                                                                                                 |
| `/app/talent`                 | Protected    | `pages/FeaturePage.jsx`                        | Placeholder for founder talent discovery.                                                                                                            |
| `/app/founder-team`           | Protected    | `pages/dashboard/FounderTeamPage.jsx`          | Create a team for an idea, view actual members, derive completion from approved roles and team members, and find candidates for missing roles.       |
| `/app/team`                   | Protected    | `pages/dashboard/CandidateTeamPage.jsx`        | View teams in which the authenticated candidate is a member.                                                                                         |
| `/app/invitations`            | Protected    | `pages/dashboard/CandidateInvitationsPage.jsx` | List sent/received invitations and open invitation details. Direction depends on `profileType`.                                                      |
| `/app/explore`                | Protected    | `pages/FeaturePage.jsx`                        | Candidate startup-exploration placeholder.                                                                                                           |
| `/app/matches`                | Protected    | `pages/FeaturePage.jsx`                        | Candidate matches placeholder.                                                                                                                       |
| `*`                           | Any          | `Navigate` in `AppRoutes.jsx`                  | Redirect unknown paths to `/`.                                                                                                                       |

`ProtectedRoute` waits for auth initialization, redirects signed-out users to `/login`, and displays an auth error state when profile loading fails. It checks Firebase sign-in; the root entry and public route additionally use `profileCompleted` to choose the onboarding or app destination.

## Authentication and Request Flow

1. `AuthProvider` subscribes to Firebase `onAuthStateChanged`.
2. For a signed-in user, it ensures Firebase auth persistence, calls `syncUser`, then loads the backend profile with `getProfile`.
3. The provider stores `firebaseUser` and `backendUser`; `profileType` and `profileCompleted` are derived from that profile.
4. Pages access the shared auth state through `useAuth()`.
5. `src/api/client.js` uses `VITE_API_URL` or defaults to `http://localhost:5000/api`.
6. Its request interceptor adds `Authorization: Bearer <Firebase ID token>` when a Firebase user is present. Its response interceptor converts backend errors to `Error` objects with `status`, `code`, and the original error as `cause`.

## API Modules

| Module                        | Use                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/api/client.js`           | Shared Axios instance, base URL, auth header, and error normalization.                                                           |
| `src/api/userApi.js`          | Sync, retrieve, update, and create user profiles.                                                                                |
| `src/services/ideaApi.js`     | Create/list/get/update/delete ideas; invoke enhancement, analysis, and approval endpoints.                                       |
| `src/services/matchingApi.js` | Candidate search/matches, invitations, and team create/list/read/member-add operations.                                          |
| `src/services/authService.js` | Firebase sign-in, sign-up, persistence, and sign-out operations.                                                                 |
| `src/services/api.js`         | Compatibility wrapper around the shared client and user-sync helper. Prefer the resource-specific API modules for new page work. |

Pages should call these modules rather than construct Axios requests directly. Backend response envelopes are returned by each module as `response.data`; page components normalize the envelopes they consume.

## Shared and Domain Components

### Application Shell

- `components/layout/AppLayout.jsx` provides the sidebar, main content region, and topbar placeholder.
- `components/layout/Sidebar.jsx` selects founder or candidate navigation using `profileType`, and signs users out through `useAuth`.

### Common UI

- `components/common/Button.jsx` provides primary and secondary button variants.
- `components/common/Card.jsx` provides the standard surface container.
- `components/common/Badge.jsx` displays statuses and compact labels.
- `components/common/Input.jsx` standardizes form input.
- `components/common/LoadingState.jsx` and `ErrorState.jsx` represent shared async states.
- `components/common/IdeaWorkflowProgress.jsx` shows progress through the idea workflow.

### Matching and Invitations

- `components/matching/CandidateCard.jsx` displays a scored candidate and supports selection, profile viewing, and invitation actions.
- `components/matching/CandidateProfileModal.jsx` presents candidate details in the matching flow.
- `components/matching/BulkInvitationComposer.jsx` and `InvitationComposer.jsx` handle invitation composition.
- `components/invitations/InvitationCard.jsx` displays invitation summaries.
- `components/invitations/InvitationDetailsModal.jsx` displays full invitation information and status actions.

## Main Workflow Composition

### Founder Idea and Matching Flow

`IdeasPage` loads the founder's ideas through `ideaApi`. `CreateIdeaPage`, `EnhanceIdeaPage`, and `AnalyzeIdeaPage` work with the same `ideaId` across persisted workflow phases. `GenerateTeamPage` loads the idea, requests scored candidates through `matchingApi`, groups results with `utils/matchGrouping.js`, and uses the matching components for candidate review and invitations.

### Team Flow

`FounderTeamPage` loads the founder's idea list, fetches each full idea for `aiAnalysis.rolesAndSkills`, and loads teams and accepted invitations from the existing APIs. It derives completion locally from approved role requirements and actual `team.members`; accepted invitations are displayed separately and do not count as members. Missing-role actions navigate to the existing matching route with a `role` query. `CandidateTeamPage` reads the same Team API for a candidate's memberships.

### Invitation Flow

`CandidateInvitationsPage` selects `sent` or `received` based on `profileType`, requests the appropriate invitation list, and composes `InvitationCard` with `InvitationDetailsModal`. The backend remains authoritative for status transitions and authorization.

## Styling and Conventions

Global design tokens and base styles are in `src/index.css`; app-shell and shared control styles are in `src/App.css`. Components use the existing CSS variables (such as `--surface`, `--ink`, `--accent`, `--line`, spacing, radius, and shadows) and page-level inline styles where the current implementation does so. Keep new UI within those existing patterns.

Page components generally own async loading/error state and use effects/callbacks for data synchronization. Keep backend contracts inside API modules, use the existing response shape, and avoid duplicating matching/scoring logic in the UI.

## Non-routed Components

`components/Header.jsx`, `components/Dashboard.jsx`, `components/LoginScreen.jsx`, and the standalone `components/forms/IdeaForm.jsx`, `FounderForm.jsx`, and `CandidateForm.jsx` exist in the source tree but are not used by the active `AppRoutes`/`AppLayout` composition. The routed pages implement the active login, onboarding, and idea-creation workflows. The active login page is `pages/auth/LoginPage.jsx`; the active dashboard entry is `pages/ApplicationEntryPage.jsx`. Re-check imports and backend request contracts before extending or replacing these standalone components.

## Commands

Run from `frontend/`:

```sh
npm run dev
npm test
npm run lint
npm run build
```
