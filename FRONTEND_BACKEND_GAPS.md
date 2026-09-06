# Frontend and Backend Integration Audit

## 1) Exact Founder payload

The backend founder-create route is:

- `POST /api/users/profile`
- Auth required via Firebase Bearer token

Exact payload accepted by the controller:

```json
{
  "profileType": "founder",
  "companyStage": "idea",
  "expertiseAreas": ["Product", "AI"],
  "lookingFor": ["Frontend engineer", "Growth lead"],
  "yearsExperience": 4,
  "bio": "I am building an AI startup around developer workflows."
}
```

Validation in `backend/controllers/userController.js`:

- `profileType` must be exactly `"founder"`
- `companyStage` may be `"idea"`, `"early"`, `"growth"`, or `""`
- `expertiseAreas` and `lookingFor` must be arrays of strings
- `yearsExperience` is optional number
- `bio` is optional string

The backend user model also includes these fields for founders:

```json
{
  "bio": "string",
  "expertiseAreas": ["string"],
  "lookingFor": ["string"],
  "companyStage": "idea | early | growth | \"\"",
  "yearsExperience": 0
}
```

Important gap:

- Frontend must not send a founder payload shaped like `name, email, location, skills` unless it is being sent to a separate update call.
- `POST /api/users/profile` is specifically the founder creation endpoint and does not require `skills`.

## 2) Exact Candidate payload

The backend candidate-create route is:

- `POST /api/users/candidate-profile`
- Auth required via Firebase Bearer token

The controller accepts these fields:

```json
{
  "targetRoles": ["Frontend Engineer", "Product Manager"],
  "skills": ["React", "Node.js", "Product Design"],
  "availability": "full-time",
  "location": {
    "city": "Boston",
    "state": "MA",
    "region": "US"
  },
  "experience": 3,
  "qualifications": ["BSc CS", "AWS Certified"]
}
```

But the actual model schema expects `skills` as an array of objects, not plain strings. The safe payload that matches both the controller and schema is:

```json
{
  "targetRoles": ["Frontend Engineer"],
  "skills": [
    { "name": "React", "level": "Advanced" },
    { "name": "Node.js", "level": "Intermediate" }
  ],
  "availability": "full-time",
  "location": {
    "city": "Boston",
    "state": "MA",
    "region": "US"
  },
  "experience": 3,
  "qualifications": ["BSc CS"]
}
```

Validation in the actual code:

- `skills` and `targetRoles` must both be arrays
- `availability` may be `"full-time"`, `"part-time"`, `"flexible"`, or `""`
- `profileType` is set on the backend as `"candidate"`

Important gap:

- Frontend should not send a candidate payload with route `/api/candidates` or a route that omits the `/api/users` prefix.
- It also should not send a plain array of skill strings unless the backend is intentionally changed to accept that format; current schema expects skill objects.

## 3) After-login exact flow

This is the real login-to-profile flow used by the current frontend and backend.

### Step 1 — Firebase sign in

The frontend uses Firebase auth in `frontend/src/services/authService.js`:

- `signup(email, password)`
- `login(email, password)`
- `loginWithGoogle()`
- `logout()`

After a successful Firebase authentication, `authenticateAndSync()` runs:

```js
await ensureAuthPersistence();
const result = await firebaseAuthentication();
await syncCurrentUser(result.user);
```

### Step 2 — Frontend sync request

`frontend/src/services/api.js` sends the sync payload:

```js
const response = await api.post(
  "/users/sync",
  {
    name: firebaseUser.displayName || "",
    profileImage: firebaseUser.photoURL || "",
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

This means:

- The frontend retrieves a Firebase ID token via `firebaseUser.getIdToken()`
- It sends it in the Bearer header
- It does a POST to `/users/sync` on the API base URL

### Step 3 — Backend verification

`backend/middleware/authMiddleware.js` runs before `/api/users/sync`:

- checks `Authorization` header
- verifies token with `firebase-admin/auth`
- stores `req.user = decodedUser`
- returns `401` if missing or invalid

### Step 4 — Backend user creation/upsert

The controller `syncCurrentUser` creates or updates the Mongo document using Firebase info:

```js
const userData = {
  firebaseUid,
  email: firebaseEmail,
  name: getFirstValue(requestedName, firebaseName, firebaseEmail, firebaseUid),
  profileImage: getFirstValue(requestedProfileImage, firebasePicture),
  college: { name: "" },
  location: { city: "", state: "", region: "" },
  skills: [],
  interests: [],
  profileCompleted: false,
};
```

This means the backend creates a base account immediately after Firebase login, even before the user fills out the profile.

### Step 5 — Profile completion flow

After sync, the app should continue with one of these actual routes:

- Founder: `POST /api/users/profile`
- Candidate: `POST /api/users/candidate-profile`
- Update profile: `PUT /api/users/profile`
- Fetch current profile: `GET /api/users/profile`

The backend marks `profileCompleted` as true only when the required fields are present, e.g.:

- founder requires `name` + `profileType` + `bio`
- candidate requires `name` + `profileType` + at least one skill

## 4) Current mismatch summary

### Route mismatches

The frontend is currently inconsistent with the real backend routes.

Wrong patterns observed:

- `/api/profiles`
- `/api/candidates`
- random profile routes outside `/api/users`

Actual routes:

- `/api/users/profile`
- `/api/users/candidate-profile`
- `/api/users/sync`
- `/api/candidates/search/with-scores`
- `/api/invitations`
- `/api/teams`

### Payload mismatches

Observed mismatch pattern:

- frontend may assume a different founder/candidate shape
- backend requires exact type-sensitive validation for founder and role arrays
- candidate `skills` should be structured as skill objects with `{ name, level }` for the real schema

### Priority

CRITICAL for frontend integration: the frontend must align with the backend route structure and the verified payload shapes before any profile submission or matching flow is attempted.
