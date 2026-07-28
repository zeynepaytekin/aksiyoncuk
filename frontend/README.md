# Aksiyoncuk frontend

## Local setup

Requirements: Node.js, npm, the Spring Boot API on port 8080, and the
PostgreSQL development container used by the backend.

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. `NEXT_PUBLIC_API_BASE_URL` is embedded in the
browser bundle at build time, so set it before `npm run build`.

Authentication calls the real API at `/auth/register`, `/auth/login`,
`/auth/refresh`, `/auth/logout`, and `/auth/me`. Registration is followed by a
login because registration itself does not issue tokens.

## Temporary browser token storage

The access token exists only in Zustand memory. Browser storage contains only
the rotating refresh token and its expiry, which are needed to restore a
session after reload. Passwords, access tokens, and user identity are never
persisted by the authentication layer. This is an interim design: the refresh
token should move to a backend-managed `Secure`, `HttpOnly`, `SameSite` cookie
when that endpoint contract is available.

Profile identity comes from `/auth/me`. Jobs and other unfinished content
sections remain mock-backed. Private profile display and editing
use `/profiles/me`; public profiles use `/profiles/{username}` through the
static-export-compatible client route `/users?username={username}`. Profile
drafts are component-local and are never persisted in browser storage.

Portfolio Works use the real `/works` and `/users/{username}/works` APIs.
Private works appear on `/profile`; public works appear on
`/users?username={username}`. Static client routes `/works/edit?id={workId}` and
`/works/view?id={workId}` provide owner editing and public detail views without
requiring a Next.js runtime server. Work form drafts and API responses are not
persisted in browser storage. Legacy `aksiyoncuk_works` data is ignored.

## Verification

```powershell
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
```
## Jobs / Project Board

Jobs now use the Spring Boot API rather than browser storage. Public users can
browse `/jobs` and `/jobs/view?id=JOB_ID`. Authenticated owners can create,
edit, close, reopen, and delete listings through the static-export-compatible
query routes. Job drafts and API responses are not persisted in browser
storage. Applications, saved jobs, messaging, attachments, and payments are
not implemented.
