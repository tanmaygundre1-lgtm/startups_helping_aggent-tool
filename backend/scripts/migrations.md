# StartupLink Phase 1 Schema Notes

## Current schemas

- `User`: Firebase-backed founder and candidate profiles.
- `Idea`: Founder-owned startup ideas and inline AI analysis.
- `Match`: Existing matching record prepared for the next phase.

## Indexes

- `User.firebaseUid` and `User.email` are unique indexes.
- `User.profileType`, skill names, target roles, and domain interests are indexed.
- `Idea.createdBy`, status, and creation date are indexed.
- `Idea.owner_creation_request_unique` uniquely scopes idempotent create requests to an owner.
- `Idea.seed_key_unique` identifies managed seed ideas without relying on titles.
- `Match.ideaId`, `Match.userId`, and the pair `(ideaId, userId)` are indexed.

## Phase 1 persistence decision

AI analysis is stored inline in `Idea.aiAnalysis` because the current API returns and edits analysis by idea ID. `Analysis` is also available as a normalized model for future migration when analysis history or multiple revisions are required.

## Future migrations

- Before deploying idempotent idea creation, inspect existing records for any populated `creationRequestId` or `seedKey` values, then create the new indexes with `Idea.createIndexes()` (or the equivalent MongoDB `createIndex` commands). This application does not automatically migrate or delete existing records.
- The legacy `[SEED] Campus Team Matching Platform` record can be adopted by the safe seed script because it is scoped to the deterministic seed founder and exact legacy title. Other `[SEED]`-prefixed records are not targeted.

- Move analysis revisions into `Analysis` while preserving the current API response shape.
- Add invitation and notification persistence in the team-formation phase.
- Add audit fields for profile and idea edits.
