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
# Media uploads

The browser integrates directly with the Spring Boot multipart API through the
existing authenticated API client; static export remains enabled and no Next.js
upload proxy is required. Profile avatar and cover replacement/deletion, up to
four post images, and up to twelve work images are supported. Uploads use the
`file` multipart part and the browser supplies the multipart boundary.

JPEG, PNG, and WebP are accepted. Limits are 5 MB for avatars, 10 MB for covers
and post images, and 15 MB for work images. Selected files and preview Object
URLs remain component-local. Object URLs are revoked when selection changes or
the picker unmounts, and neither files nor upload state are persisted.

Posts and works are created before their images are uploaded. A failed image
does not remove the successfully created parent or already uploaded images;
failed selections remain available for retry where the editor stays open.
Existing media is rendered in backend display order, and owners can add,
delete, or move images with labeled controls.

Media URLs are public. Uploaded files may retain EXIF/GPS metadata, so users
should remove sensitive metadata before upload when necessary. The UI does not
claim malware scanning. Current exclusions include video, cropping,
transformations, streaming, direct-to-storage uploads, private signed URLs, and
numeric upload progress (the current fetch transport uses an accessible
indeterminate state).
# Freelance marketplace

Phase 1 uses the real `/api/v1/freelance` backend through the shared authenticated
API client. Public browsing lives at `/freelance`; query-string filters cover text,
category, seller, price, delivery, rating, package tier, sort, and page. Static
export is preserved by using query routes:

- `/freelance/service?service=<uuid>`
- `/freelance/create`
- `/freelance/manage?service=<uuid>` (without `service`, this is the seller dashboard)
- `/freelance/orders?tab=buying|selling&status=<status>&page=<number>`
- `/freelance/order?order=<uuid>`

Categories are read-only and retain backend display order and hierarchy. Listings
move through `DRAFT`, `PUBLISHED`, `PAUSED`, and terminal `ARCHIVED`. A service
contains one to three unique BASIC/STANDARD/PREMIUM packages. Package prices are
entered as decimal strings and sent in TRY without client-side arithmetic. The
editor links up to six existing owned portfolio works and manages up to eight
public JPEG/PNG/WebP images (15 MB each); the first image is the thumbnail.

Orders snapshot package terms server-side and move through CREATED, IN_PROGRESS,
DELIVERED, REVISION_REQUESTED, CANCELLATION_REQUESTED, COMPLETED, or CANCELLED.
The seller can start, reject, deliver plain text, and acknowledge revisions. The
buyer can request included revisions and complete. Either participant can request
cancellation; the other party accepts/rejects and the requester can withdraw.
Completed eligible buyers can submit one 1–5 review. Contact actions create or
reuse a conversation and open `/messages?conversation=<uuid>` without sending an
automatic message.

Marketplace notification enum labels and order links are integrated into the
existing notification UI. Marketplace state uses a focused Zustand store with
stale-response protection and entity synchronization. It is deliberately not
persisted in localStorage or sessionStorage; files and object URLs remain local to
the editor.

Owned listing summaries include lifecycle status, updated time, aggregates,
category, lowest active price, and a public thumbnail, so the seller dashboard
does not issue per-listing detail requests. Service work references may include a
nullable public thumbnail. Order detail includes deterministically ordered
cancellation history while retaining `pendingCancellation` for active controls.
Resolved cancellation entries identify requester/resolver roles without exposing
account contact or storage information.

Exact user-facing limitation: “No payment is processed at this stage.”

Phase 1 has no payment forms or processing, escrow, wallets, refunds, disputes,
payouts, commissions, subscriptions, promotion, coupons, delivery attachments,
video/private media, WebSocket updates, or automatic completion timers.
