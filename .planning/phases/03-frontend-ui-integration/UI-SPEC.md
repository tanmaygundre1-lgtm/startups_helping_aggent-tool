# UI Specification: Frontend UI & Integration (Phase 3)

## 1. Project Overview

This phase focuses on building the React-based frontend application for StartupLink V1, integrating with the established backend API to support founder and candidate onboarding, and startup idea management.

## 2. Design System

### 2.1 Color Palette

- `--color-primary-blue`: #0070f3 (Interactive elements)
- `--color-alert-red`: #e00 (Error states)
- `--color-neutral-text`: #333
- `--color-neutral-bg`: #f4f4f4

### 2.2 Typography

- `font-family`: Inter, sans-serif
- `H1`: 32px, bold, 1.2
- `H2`: 24px, semibold, 1.3
- `Body`: 16px, normal, 1.5

### 2.3 Spacing Scale (4px root)

- `xs`: 4px, `sm`: 8px, `md`: 16px, `lg`: 32px

### 2.4 Component Standards

- **Buttons:** Padding `md` horizontal, `sm` vertical. Primary state (Blue), Hover (Darker Blue), Focus (Ring), Disabled (Gray).
- **Inputs:** Height `40px`, border `1px solid #ccc`, focus border `2px solid Blue`.

## 3. Copywriting & Accessibility

- **Voice:** Direct, encouraging, clear.
- **Error Messages:** "Unable to [action]. Please try again."
- **Accessibility (WCAG 2.1 AA):**
  - Minimum contrast ratio: 4.5:1.
  - Focus indicators required on all interactive elements.
  - Semantic HTML (`<button>`, `<main>`, `<nav>`) required.

## 3. UI Components & Layout

### 3.1 Global Navigation

- **Header:** Logo, User Context (Profile/Logout, Authentication status).
- **Sidebar/Tab Navigation:** Quick access to `Dashboard`, `My Profile`, `Ideas`, `Matching` (when implemented).

### 3.2 Feature-Specific Forms

- **Founder Profile (`/profiles/founder`):**
  - Form fields: Full Name, Email (read-only), University, Major/Domain (select).
  - Validation: Required fields, email format.
  - Action: Submit/Update profile via `POST`/`PUT /api/profiles`.
- **Candidate Profile (`/profiles/candidate`):**
  - Form fields: Name, Email (read-only), Skills (Multi-select), Experience Level (Select), Interest Domains (Multi-select), Preferred Role (Select), Work Preference (Select), Availability (Input).
  - Integration: Fetch predefined taxonomy for Skills/Domains from backend APIs.
  - Action: Submit/Update profile via `POST`/`PUT /api/candidates`.
- **Idea Creation Dashboard (`/ideas/new`):**
  - Form fields: Title, Pitch (Textarea - 50+ chars), Domain (Select), Problem Statement, Target Users.
  - Action: Submit idea via `POST /api/ideas`, status auto-set to "Draft".

## 4. Navigation Flow

1.  **Login/Signup (Firebase):** Entry point.
2.  **Onboarding Routing:**
    - If no profile exists: Redirect to Profile Creation based on Role selection.
    - If profile exists: Redirect to Dashboard.
3.  **Dashboard:** Access to "Create New Idea" or "View Existing Ideas".

## 5. Technical Integration (API)

- **Service Layer (`frontend/src/services/`):** Centralize all Axios/Fetch calls to `backend/` endpoints.
- **State Management:** Minimal React `useState` for forms, `useEffect` for data fetching.
- **Error Handling:** Inline form errors, toast notifications for API failure.
- **Authentication:** Pass Firebase user token in authorization header for all backend requests.
