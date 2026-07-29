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
storage. Applications, saved jobs, attachments, and payments are
not implemented.

## Direct messaging

Authenticated users access one-to-one messaging at `/messages`. A selected
conversation uses `/messages?conversation=CONVERSATION_ID`, a static-export
compatible query route that needs no Next.js runtime server. Conversation
pages preserve backend order. Message pages arrive newest-first but render
chronologically; loading older messages prepends deduplicated records while
preserving scroll position.

Unread totals appear in the Navbar. Summary, conversation list, and open
conversation polling run every 25, 12, and 6 seconds respectively. Polling
pauses while the document is hidden and retains valid data on transient
failure. Opening a conversation marks it read after content loads. Logout
clears messaging state; conversations, messages, and drafts are never stored
in browser storage.

The responsive UI includes keyboard-operable conversation selection, a
focus-managed New Message dialog, accessible unread labels, plain-text
multiline messages, and IME-safe Enter-to-send behavior.

Limitations: no WebSockets, groups, attachments, editing/deletion, reactions,
typing indicators, presence, per-message read receipts, push notifications,
voice messages, message search, or encryption.
