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

Profile identity comes from `/auth/me`. The existing posts, works, jobs, and
other profile content remain mock-backed. Profile editing is intentionally
read-only until the backend exposes a profile update endpoint.

## Verification

```powershell
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
```
