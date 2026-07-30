# Aksiyoncuk Backend

## Local development startup

Keep local credentials in the repository-root `.env` file. It is Git-ignored and
must never be committed. Start PostgreSQL and MinIO with:

```powershell
docker compose up -d postgres minio minio-init
```

Then start the packaged backend with one command:

```powershell
./scripts/start-backend-dev.ps1
```

The script loads the root `.env` into the backend process, selects the `dev`
profile, packages the application, and starts the jar. Use `-SkipBuild` only
when the current jar is already packaged.

`MINIO_ROOT_USER` must equal `MEDIA_STORAGE_ACCESS_KEY`, and
`MINIO_ROOT_PASSWORD` must equal `MEDIA_STORAGE_SECRET_KEY`. Local MinIO uses
API URL `http://localhost:9000`, Console URL `http://localhost:9001`, and bucket
`aksiyoncuk-media`.

If an upload returns `MEDIA_STORAGE_UNAVAILABLE`, check that MinIO is healthy,
run `docker compose up -d minio minio-init`, confirm the bucket exists, and
confirm the four credential variables above match. Also ensure
`MEDIA_STORAGE_ENDPOINT=http://localhost:9000` and
`MEDIA_PATH_STYLE_ACCESS=true`.

Spring Boot foundation for the Aksiyoncuk platform.

## Required software

- Java 21
- Maven 3.6.3 or newer
- Docker Desktop with Docker Compose

## Environment variables

From the repository root, copy `.env.example` to a local `.env` file:

```powershell
Copy-Item .env.example .env
```

Replace the example password in `.env` with a local-only password. The root `.env`
configures both Docker Compose and the backend:

| Variable | Description | Example |
| --- | --- | --- |
| `POSTGRES_DB` | Database created by the PostgreSQL container | `aksiyoncuk` |
| `POSTGRES_USER` | PostgreSQL role created by the container | `aksiyoncuk` |
| `POSTGRES_PASSWORD` | Password assigned to the container role | Use a local secret |
| `DB_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/aksiyoncuk` |
| `DB_USERNAME` | PostgreSQL user | `aksiyoncuk` |
| `DB_PASSWORD` | PostgreSQL password | Use a local secret |

Keep `POSTGRES_PASSWORD` and `DB_PASSWORD` equal for local development. Docker
Compose reads the root `.env` automatically. Spring Boot does not load `.env`
files automatically, so import the values into the shell before starting it.
Never commit `.env` or real credentials.

## PostgreSQL setup

Start PostgreSQL from the repository root:

```powershell
docker compose up -d
```

Inspect container health:

```powershell
docker compose ps
docker inspect --format='{{.State.Health.Status}}' aksiyoncuk-postgres
```

Stop PostgreSQL while keeping its named-volume data:

```powershell
docker compose stop
```

To stop and remove the container and network while keeping its named-volume
data:

```powershell
docker compose down
```

## Development

From the repository root, import the local environment and run the backend with
the `dev` profile:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2], 'Process')
  }
}
Set-Location backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Verify the API health endpoint in another terminal:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

Inspect applied Flyway migrations:

```powershell
docker compose exec postgres psql -U aksiyoncuk -d aksiyoncuk -c 'TABLE flyway_schema_history;'
```

OpenAPI documentation is available in development at:

```text
http://localhost:8080/swagger-ui.html
```

## User registration

Registration creates an active user and an empty profile in one database
transaction:

```text
POST /api/v1/auth/register
```

Validation rules:

- Email is required, must be valid, and may contain at most 254 characters.
- Username is required, contains 3–30 letters, numbers, periods, or underscores,
  and is stored lowercase.
- Password is required and contains 12–72 characters.
- Full name is required and may contain at most 100 characters.
- Unknown JSON fields and malformed request bodies are rejected.

Email and username are trimmed and normalized to lowercase. Full name is
trimmed without changing its case. Passwords are stored only as BCrypt hashes.

Example request:

```json
{
  "email": "user@example.com",
  "username": "creativeuser",
  "password": "ExamplePassword123!",
  "fullName": "Creative User"
}
```

Example safe response (`201 Created`):

```json
{
  "id": "79ff9da2-80ce-4421-9a0e-af71310c782e",
  "email": "user@example.com",
  "username": "creativeuser",
  "fullName": "Creative User",
  "status": "ACTIVE",
  "createdAt": "2026-01-01T12:00:00Z",
  "profile": {
    "professionalTitle": null,
    "bio": null,
    "location": null,
    "websiteUrl": null
  }
}
```

Invalid input returns `400 Bad Request` with code `VALIDATION_FAILED`, or
`MALFORMED_REQUEST` for unreadable JSON and unknown fields. Existing normalized
email or username values return `409 Conflict` with `EMAIL_ALREADY_EXISTS` or
`USERNAME_ALREADY_EXISTS`.

Register with curl:

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"creativeuser","password":"ExamplePassword123!","fullName":"Creative User"}'
```

Register with PowerShell:

```powershell
$body = @{
  email = 'user@example.com'
  username = 'creativeuser'
  password = 'ExamplePassword123!'
  fullName = 'Creative User'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/v1/auth/register `
  -ContentType application/json `
  -Body $body
```

Inspect local users and profiles:

```powershell
docker compose exec postgres psql -U aksiyoncuk -d aksiyoncuk -c `
  'SELECT id, email, username, full_name, status, created_at FROM users;'
docker compose exec postgres psql -U aksiyoncuk -d aksiyoncuk -c `
  'SELECT id, user_id, professional_title, created_at FROM profiles;'
```

Registration does not create a session or issue any token. Clients log in
separately after registration.

## Login and JWT sessions

JWT authentication requires these environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | HS256 signing secret containing at least 32 random bytes | Required |
| `JWT_ACCESS_EXPIRATION_SECONDS` | Access-token lifetime | `900` |
| `JWT_REFRESH_EXPIRATION_SECONDS` | Refresh-token lifetime | `2592000` |

Generate a unique local secret with a cryptographically secure password
generator and keep it only in the ignored `.env` file. Never reuse the example
value or a development secret in production.

Access tokens are signed HS256 JWTs with a 15-minute default lifetime. They are
not stored in the database. Refresh tokens are opaque 256-bit random values
with a 30-day default lifetime; only their SHA-256 hashes are stored.

Login with email or username:

```text
POST /api/v1/auth/login
```

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"ExamplePassword123!"}'
```

```powershell
$login = Invoke-RestMethod -Method Post `
  -Uri http://localhost:8080/api/v1/auth/login `
  -ContentType application/json `
  -Body (@{
    identifier = 'user@example.com'
    password = 'ExamplePassword123!'
  } | ConvertTo-Json)
```

Get the authenticated user:

```bash
curl http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/v1/auth/me `
  -Headers @{ Authorization = "Bearer $($login.accessToken)" }
```

Rotate the refresh token:

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}'
```

```powershell
$refreshed = Invoke-RestMethod -Method Post `
  -Uri http://localhost:8080/api/v1/auth/refresh `
  -ContentType application/json `
  -Body (@{ refreshToken = $login.refreshToken } | ConvertTo-Json)
```

Log out:

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}'
```

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:8080/api/v1/auth/logout `
  -ContentType application/json `
  -Body (@{ refreshToken = $refreshed.refreshToken } | ConvertTo-Json)
```

Every successful refresh revokes the submitted token and creates a replacement.
Reusing a rotated token revokes all remaining active refresh tokens for that
user. Logout is idempotent and does not reveal whether a token existed.

The frontend authentication adapter is connected to these endpoints.

## Profiles

Profile endpoints:

| Method and path | Authentication | Response visibility |
| --- | --- | --- |
| `GET /api/v1/profiles/me` | Bearer access token | Private; includes email |
| `PATCH /api/v1/profiles/me` | Bearer access token | Private; includes email |
| `GET /api/v1/profiles/{username}` | Public | Public; never includes email |

PATCH accepts `fullName`, `professionalTitle`, `bio`, `location`, and
`websiteUrl`. An omitted field remains unchanged. Explicit `null`, an empty
string, or whitespace clears nullable profile fields. `fullName` cannot be null
or blank. All supplied text is trimmed.

Limits are 100 characters for full name, 120 for professional title and
location, 2,000 for biography, and 500 for website URL. A nonblank website URL
must be an absolute HTTP or HTTPS URL. Email, username, and unknown fields are
rejected.

Example private response:

```json
{
  "id": "e3d9bdd3-5b73-4ec3-b12a-d70e79244f6b",
  "user": {
    "id": "79ff9da2-80ce-4421-9a0e-af71310c782e",
    "email": "user@example.com",
    "username": "creativeuser",
    "fullName": "Creative User",
    "status": "ACTIVE",
    "createdAt": "2026-01-01T12:00:00Z"
  },
  "professionalTitle": "Director",
  "bio": null,
  "location": "Bucharest",
  "websiteUrl": "https://example.com",
  "createdAt": "2026-01-01T12:00:00Z",
  "updatedAt": "2026-01-01T12:05:00Z"
}
```

curl examples:

```bash
curl http://localhost:8080/api/v1/profiles/me \
  -H "Authorization: Bearer ACCESS_TOKEN"

curl -X PATCH http://localhost:8080/api/v1/profiles/me \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Creative Person","professionalTitle":"Director","bio":null,"websiteUrl":"https://example.com"}'

curl http://localhost:8080/api/v1/profiles/creativeuser
```

PowerShell examples:

```powershell
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Uri http://localhost:8080/api/v1/profiles/me -Headers $headers

$profile = Invoke-RestMethod -Method Patch `
  -Uri http://localhost:8080/api/v1/profiles/me `
  -Headers $headers `
  -ContentType application/json `
  -Body (@{
    fullName = 'Creative Person'
    professionalTitle = 'Director'
    bio = $null
    websiteUrl = 'https://example.com'
  } | ConvertTo-Json)

Invoke-RestMethod http://localhost:8080/api/v1/profiles/creativeuser
```

Unknown usernames return `404` with `PROFILE_NOT_FOUND`. Invalid URLs return
`400` with `INVALID_PROFILE_URL`; invalid field values return
`INVALID_PROFILE_UPDATE`.

## Posts

| Method and path | Authentication | Purpose |
| --- | --- | --- |
| `POST /api/v1/posts` | Bearer token | Create a post |
| `GET /api/v1/posts?page=0&size=20` | Public | Newest-first global feed |
| `GET /api/v1/posts/me?page=0&size=20` | Bearer token | Current user's posts |
| `GET /api/v1/posts/{postId}` | Public | Single post |
| `DELETE /api/v1/posts/{postId}` | Bearer token, owner only | Delete a post |

Post content is trimmed, required, and limited to 3,000 characters. Feed pages
default to page `0` and size `20`; size must be between `1` and `50`. Responses
include page metadata and safe author identity without email. Anonymous feed
responses always report `ownedByCurrentUser: false`.

Example:

```json
{
  "id": "392951b8-871d-46af-8087-cefc679f3b1c",
  "content": "My first post",
  "createdAt": "2026-01-01T12:00:00Z",
  "updatedAt": "2026-01-01T12:00:00Z",
  "author": {
    "id": "79ff9da2-80ce-4421-9a0e-af71310c782e",
    "username": "creativeuser",
    "fullName": "Creative User",
    "professionalTitle": "Director"
  },
  "ownedByCurrentUser": true,
  "commentCount": 0,
  "likeCount": 0,
  "likedByCurrentUser": false
}
```

curl:

```bash
curl -X POST http://localhost:8080/api/v1/posts \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"My first post"}'

curl "http://localhost:8080/api/v1/posts?page=0&size=20"
curl http://localhost:8080/api/v1/posts/POST_ID
curl -X DELETE http://localhost:8080/api/v1/posts/POST_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

PowerShell:

```powershell
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$post = Invoke-RestMethod -Method Post `
  -Uri http://localhost:8080/api/v1/posts `
  -Headers $headers `
  -ContentType application/json `
  -Body (@{ content = 'My first post' } | ConvertTo-Json)

Invoke-RestMethod 'http://localhost:8080/api/v1/posts?page=0&size=20'
Invoke-RestMethod http://localhost:8080/api/v1/posts/me -Headers $headers
Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:8080/api/v1/posts/$($post.id)" `
  -Headers $headers
```

Missing posts return `POST_NOT_FOUND`; non-owner deletion returns
`POST_DELETE_FORBIDDEN`. Media, likes, reposts, editing, and moderation are not
implemented yet.

## Post comments

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/posts/{postId}/comments` | Bearer token | Create a comment |
| `GET` | `/api/v1/posts/{postId}/comments?page=0&size=20` | Public | List comments oldest first |
| `DELETE` | `/api/v1/comments/{commentId}` | Bearer token | Delete an owned comment |

Comment content is trimmed, must not be blank, and is limited to 2000
characters. List pagination defaults to page `0` and size `20`; size must be
between `1` and `50`. Anonymous responses set `ownedByCurrentUser` to `false`.
Only the comment owner may delete it. Deleting a post also deletes its comments.

```json
{
  "id": "4e737e1b-f790-45fa-9e3e-f8caafbb4fb5",
  "postId": "392951b8-871d-46af-8087-cefc679f3b1c",
  "content": "Great project.",
  "createdAt": "2026-01-01T12:01:00Z",
  "updatedAt": "2026-01-01T12:01:00Z",
  "author": {
    "id": "79ff9da2-80ce-4421-9a0e-af71310c782e",
    "username": "creativeuser",
    "fullName": "Creative User",
    "professionalTitle": "Director"
  },
  "ownedByCurrentUser": true
}
```

curl:

```bash
curl -X POST http://localhost:8080/api/v1/posts/POST_ID/comments \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Great project."}'

curl "http://localhost:8080/api/v1/posts/POST_ID/comments?page=0&size=20"
curl -X DELETE http://localhost:8080/api/v1/comments/COMMENT_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

PowerShell:

```powershell
$comment = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/posts/$($post.id)/comments" `
  -Headers $headers `
  -ContentType application/json `
  -Body (@{ content = 'Great project.' } | ConvertTo-Json)

Invoke-RestMethod `
  "http://localhost:8080/api/v1/posts/$($post.id)/comments?page=0&size=20"
Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:8080/api/v1/comments/$($comment.id)" `
  -Headers $headers
```

Missing comments return `COMMENT_NOT_FOUND`; non-owner deletion returns
`COMMENT_DELETE_FORBIDDEN`. Replies, editing, comment likes, mentions,
notifications, moderation, and attachments are not implemented.

## Post likes

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `PUT` | `/api/v1/posts/{postId}/like` | Bearer token | Idempotently like a post |
| `DELETE` | `/api/v1/posts/{postId}/like` | Bearer token | Idempotently remove the current user's like |

Both operations return HTTP 200. Repeating a like keeps exactly one database
row, and repeating an unlike remains successful:

```json
{
  "postId": "392951b8-871d-46af-8087-cefc679f3b1c",
  "likedByCurrentUser": true,
  "likeCount": 12
}
```

Public post responses include the real `likeCount` and always return
`likedByCurrentUser: false`. Authenticated post responses calculate the flag for
the access-token subject.

curl:

```bash
curl -X PUT http://localhost:8080/api/v1/posts/POST_ID/like \
  -H "Authorization: Bearer ACCESS_TOKEN"
curl -X DELETE http://localhost:8080/api/v1/posts/POST_ID/like \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

PowerShell:

```powershell
Invoke-RestMethod -Method Put `
  -Uri "http://localhost:8080/api/v1/posts/$($post.id)/like" `
  -Headers $headers
Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:8080/api/v1/posts/$($post.id)/like" `
  -Headers $headers
```

Comment likes, reaction types, notifications, analytics, trending logic, and
realtime updates are not implemented.

## Portfolio works

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/works` | Bearer token | Create a work |
| `GET` | `/api/v1/works/me?page=0&size=20` | Bearer token | List the current user's works |
| `GET` | `/api/v1/users/{username}/works?page=0&size=20` | Public | List a user's public works |
| `GET` | `/api/v1/works/{workId}` | Public | Get a single work |
| `PATCH` | `/api/v1/works/{workId}` | Owner bearer token | Partially update a work |
| `DELETE` | `/api/v1/works/{workId}` | Owner bearer token | Delete a work |

Supported `workType` values are `FILM`, `SHORT_FILM`, `DOCUMENTARY`, `SERIES`,
`COMMERCIAL`, `MUSIC_VIDEO`, `PHOTOGRAPHY`, `THEATRE`, and `OTHER`.

Titles are required, trimmed, and limited to 200 characters. Descriptions are
optional and limited to 5000 characters. Project URLs must be absolute HTTP or
HTTPS URLs and are limited to 500 characters. Release years must be between
1888 and the current UTC year plus five. Pagination defaults to page `0` and
size `20`; size must be between `1` and `50`.

Create request:

```json
{
  "title": "My Short Film",
  "description": "Project description",
  "workType": "SHORT_FILM",
  "projectUrl": "https://example.com/project",
  "releaseYear": 2026
}
```

Safe response:

```json
{
  "id": "2cc27ea4-e31e-42e0-8515-799deca16da7",
  "title": "My Short Film",
  "description": "Project description",
  "workType": "SHORT_FILM",
  "projectUrl": "https://example.com/project",
  "releaseYear": 2026,
  "createdAt": "2026-01-01T12:00:00Z",
  "updatedAt": "2026-01-01T12:00:00Z",
  "owner": {
    "id": "79ff9da2-80ce-4421-9a0e-af71310c782e",
    "username": "creativeuser",
    "fullName": "Creative User",
    "professionalTitle": "Director"
  },
  "ownedByCurrentUser": true
}
```

PATCH distinguishes omitted fields from explicit null. Omitted fields remain
unchanged; `null` clears `description`, `projectUrl`, or `releaseYear`. `title`
and `workType` cannot be cleared.

curl:

```bash
curl -X POST http://localhost:8080/api/v1/works \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Short Film","description":"Project description","workType":"SHORT_FILM","projectUrl":"https://example.com/project","releaseYear":2026}'

curl "http://localhost:8080/api/v1/users/creativeuser/works?page=0&size=20"
curl http://localhost:8080/api/v1/works/WORK_ID

curl -X PATCH http://localhost:8080/api/v1/works/WORK_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":null,"releaseYear":2027}'

curl -X DELETE http://localhost:8080/api/v1/works/WORK_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

PowerShell:

```powershell
$work = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/works" `
  -Headers $headers `
  -ContentType application/json `
  -Body (@{
    title = 'My Short Film'
    description = 'Project description'
    workType = 'SHORT_FILM'
    projectUrl = 'https://example.com/project'
    releaseYear = 2026
  } | ConvertTo-Json)

Invoke-RestMethod `
  "http://localhost:8080/api/v1/users/creativeuser/works?page=0&size=20"
Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:8080/api/v1/works/$($work.id)" `
  -Headers $headers `
  -ContentType application/json `
  -Body (@{ description = $null; releaseYear = 2027 } | ConvertTo-Json)
Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:8080/api/v1/works/$($work.id)" `
  -Headers $headers
```

All works are public until visibility controls are introduced. Only owners may
update or delete their works. Media uploads, thumbnails, videos, external file
storage, tags, collaborators, likes, comments, awards, and drafts are not
implemented.

## Jobs / Project Board API

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/jobs` | Bearer token | Create an `OPEN` listing |
| `GET` | `/api/v1/jobs` | Public | Browse listings and filters |
| `GET` | `/api/v1/jobs/me` | Bearer token | List the current user's listings |
| `GET` | `/api/v1/jobs/{jobId}` | Public | Read one listing |
| `PATCH` | `/api/v1/jobs/{jobId}` | Owner | Partially update a listing |
| `POST` | `/api/v1/jobs/{jobId}/close` | Owner | Idempotently close a listing |
| `POST` | `/api/v1/jobs/{jobId}/reopen` | Owner | Idempotently reopen a listing |
| `DELETE` | `/api/v1/jobs/{jobId}` | Owner | Delete a listing |

Supported values:

- `category`: `VOLUNTEER`, `STUDENT`, `AMATEUR`, `PROFESSIONAL`
- `workMode`: `ONSITE`, `REMOTE`, `HYBRID`
- `compensationType`: `UNPAID`, `FIXED`, `NEGOTIABLE`
- `status`: `OPEN`, `CLOSED`

`FIXED` requires a positive amount and three-letter currency. `UNPAID` requires
both fields to be null. `NEGOTIABLE` permits a null amount and optional
currency; a supplied amount must be positive. Currency is normalized to
uppercase. Application deadlines must be future UTC instants.

Create and browse:

```bash
curl -X POST http://localhost:8080/api/v1/jobs \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Looking for editor","description":"Project description","category":"PROFESSIONAL","workMode":"REMOTE","location":"Istanbul","compensationType":"FIXED","compensationAmount":25000.00,"currency":"TRY","applicationDeadline":"2026-12-31T20:00:00Z"}'

curl "http://localhost:8080/api/v1/jobs?page=0&size=20&status=OPEN&category=PROFESSIONAL&workMode=REMOTE"
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  "http://localhost:8080/api/v1/jobs/me?status=CLOSED"
```

PATCH distinguishes omission from explicit null. Omitted fields remain
unchanged; nullable `location`, `compensationAmount`, `currency`, and
`applicationDeadline` may be cleared with null. The merged compensation state
is always revalidated.

```bash
curl -X PATCH http://localhost:8080/api/v1/jobs/JOB_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location":null,"compensationType":"NEGOTIABLE","compensationAmount":null}'
curl -X POST http://localhost:8080/api/v1/jobs/JOB_ID/close \
  -H "Authorization: Bearer ACCESS_TOKEN"
curl -X POST http://localhost:8080/api/v1/jobs/JOB_ID/reopen \
  -H "Authorization: Bearer ACCESS_TOKEN"
curl -X DELETE http://localhost:8080/api/v1/jobs/JOB_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

PowerShell:

```powershell
$job = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/jobs" `
  -Headers $headers -ContentType application/json `
  -Body (@{
    title = 'Looking for editor'
    description = 'Project description'
    category = 'PROFESSIONAL'
    workMode = 'REMOTE'
    compensationType = 'FIXED'
    compensationAmount = 25000
    currency = 'TRY'
  } | ConvertTo-Json)
Invoke-RestMethod "http://localhost:8080/api/v1/jobs?page=0&size=20"
Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:8080/api/v1/jobs/$($job.id)" `
  -Headers $headers -ContentType application/json `
  -Body (@{ location = $null } | ConvertTo-Json)
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/jobs/$($job.id)/close" -Headers $headers
Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:8080/api/v1/jobs/$($job.id)" -Headers $headers
```

Global browsing defaults to `OPEN`, is ordered by `createdAt DESC, id DESC`,
and supports pages from zero with sizes 1–50. Public responses never include
email or credentials. Only owners can update, transition, or delete listings.
Applications, applicants, saved jobs, payments, messaging, attachments, and
notifications are not implemented yet.

## Job Applications API

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/jobs/{jobId}/applications` | Applicant | Apply to an open job |
| `GET` | `/api/v1/job-applications/me` | Applicant | List own applications |
| `GET` | `/api/v1/jobs/{jobId}/applications` | Job owner | List applications for an owned job |
| `GET` | `/api/v1/job-applications/{applicationId}` | Applicant or owner | View one application |
| `POST` | `/api/v1/job-applications/{applicationId}/withdraw` | Applicant | Withdraw a submitted application |
| `POST` | `/api/v1/job-applications/{applicationId}/accept` | Job owner | Accept a submitted application |
| `POST` | `/api/v1/job-applications/{applicationId}/reject` | Job owner | Reject a submitted application |

Application statuses are `SUBMITTED`, `ACCEPTED`, `REJECTED`, and
`WITHDRAWN`. Only `SUBMITTED` may transition. Accept, reject, and withdraw
produce terminal states. Repeating the same terminal operation is idempotent;
conflicting transitions return `INVALID_JOB_APPLICATION_TRANSITION`.

Apply:

```bash
curl -X POST http://localhost:8080/api/v1/jobs/JOB_ID/applications \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coverLetter":"I would like to apply."}'
```

The cover letter is optional, trimmed, converted from blank to null, and
limited to 5000 characters. Job owners cannot apply to their own listings, a
job must be open, and the `(job, applicant)` pair is unique.

List and transition:

```bash
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  "http://localhost:8080/api/v1/job-applications/me?page=0&size=20&status=SUBMITTED"
curl -H "Authorization: Bearer OWNER_ACCESS_TOKEN" \
  "http://localhost:8080/api/v1/jobs/JOB_ID/applications?page=0&size=20"
curl -X POST -H "Authorization: Bearer ACCESS_TOKEN" \
  http://localhost:8080/api/v1/job-applications/APPLICATION_ID/withdraw
curl -X POST -H "Authorization: Bearer OWNER_ACCESS_TOKEN" \
  http://localhost:8080/api/v1/job-applications/APPLICATION_ID/accept
curl -X POST -H "Authorization: Bearer OWNER_ACCESS_TOKEN" \
  http://localhost:8080/api/v1/job-applications/APPLICATION_ID/reject
```

PowerShell:

```powershell
$application = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/jobs/$jobId/applications" `
  -Headers $headers -ContentType application/json `
  -Body (@{ coverLetter = 'I would like to apply.' } | ConvertTo-Json)
Invoke-RestMethod `
  "http://localhost:8080/api/v1/job-applications/me?page=0&size=20" `
  -Headers $headers
Invoke-RestMethod `
  "http://localhost:8080/api/v1/jobs/$jobId/applications?status=SUBMITTED" `
  -Headers $ownerHeaders
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/job-applications/$($application.id)/accept" `
  -Headers $ownerHeaders
```

Application responses contain safe public applicant and job-owner identity
only. Job responses expose `applicationCount` but never embed application
arrays. Resumes, attachments, messaging, notifications, interviews, payments,
contracts, and application deletion are not implemented.

Production uses the same required database environment variables with the `prod` profile. API documentation is disabled in that profile:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## Tests

Integration tests use disposable PostgreSQL 17 Testcontainers instances and do
not depend on the manually running development database. Docker must be
available:

```bash
mvn test
```

Create the executable JAR:

```bash
mvn clean package
```

Run formatting validation:

```bash
mvn spotless:check
```

Apply formatting when intentionally updating source files:

```bash
mvn spotless:apply
```

## Package architecture

The project uses package-by-feature:

```text
com.aksiyoncuk
├── common
│   ├── config       Cross-cutting Spring configuration
│   ├── exception    Global exception translation
│   └── response     Shared API response models
├── auth             JWT authentication and refresh-token sessions
├── user             Registration and user persistence
├── profile          Private/public profile API and persistence
├── post             Posts and post comments
├── work             Portfolio work API and persistence
├── job              Jobs / Project Board API and persistence
├── network          Follow relationships and network summaries
└── notification     Polling-based in-app notifications
```

Future feature packages should own their controllers, DTOs, services, repositories, entities, and mappers. Controllers must expose DTOs rather than JPA entities. Database changes must be introduced through versioned Flyway migrations.

## Operational endpoints

Only Actuator health is exposed over HTTP:

```text
GET /actuator/health
```

Health details are not returned publicly. Other Actuator endpoints remain unexposed.
## Follow and network API

The network API models a direct, public follow relationship. Connection requests, private
accounts, blocking, recommendations, and messaging are not implemented. New follows generate
in-app notifications through the notifications module.

| Method | Endpoint | Authentication | Behavior |
| --- | --- | --- | --- |
| `PUT` | `/api/v1/users/{username}/follow` | Required | Idempotently follow a user |
| `DELETE` | `/api/v1/users/{username}/follow` | Required | Idempotently unfollow a user |
| `GET` | `/api/v1/users/{username}/followers?page=0&size=20` | Public | Followers, newest first |
| `GET` | `/api/v1/users/{username}/following?page=0&size=20` | Public | Followed users, newest first |
| `GET` | `/api/v1/network/me` | Required | Current user's follower, following, and mutual counts |

Usernames are trimmed and normalized with locale-independent lowercase rules. Following
yourself is rejected with `SELF_FOLLOW_NOT_ALLOWED`. Repeated follow and unfollow calls are
successful and return the authoritative count state. List pages use zero-based pagination;
`size` must be between 1 and 50.

Public and private profile responses now include:

```json
{
  "followerCount": 42,
  "followingCount": 18,
  "followedByCurrentUser": false
}
```

Anonymous viewers always receive `followedByCurrentUser: false`. Authenticated public-profile
requests and network list items reflect whether the current viewer follows the represented user.
Public responses do not expose email addresses, password hashes, or authentication data.

Follow and inspect a network with curl:

```bash
curl -X PUT http://localhost:8080/api/v1/users/creativeuser/follow \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "http://localhost:8080/api/v1/users/creativeuser/followers?page=0&size=20"
curl "http://localhost:8080/api/v1/users/creativeuser/following?page=0&size=20"

curl http://localhost:8080/api/v1/network/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -X DELETE http://localhost:8080/api/v1/users/creativeuser/follow \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

PowerShell:

```powershell
$headers = @{ Authorization = "Bearer $accessToken" }
Invoke-RestMethod -Method Put `
  -Uri "http://localhost:8080/api/v1/users/creativeuser/follow" `
  -Headers $headers

Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/users/creativeuser/followers?page=0&size=20"

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/network/me" -Headers $headers

Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:8080/api/v1/users/creativeuser/follow" `
  -Headers $headers
```

## Notifications API

Notifications are persisted when a user is followed, another user's post is liked or
commented on, a job receives an application, or an application is accepted or rejected.
Self-likes and self-comments do not notify the actor. The API is polling-based; email, push,
SMS, WebSocket delivery, preferences, and digests are not implemented.

| Method | Endpoint | Authentication | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/v1/notifications?page=0&size=20` | Required | List the current user's notifications |
| `GET` | `/api/v1/notifications/summary` | Required | Return the unread count |
| `POST` | `/api/v1/notifications/{id}/read` | Required | Idempotently mark one notification read |
| `POST` | `/api/v1/notifications/{id}/unread` | Required | Idempotently mark one notification unread |
| `POST` | `/api/v1/notifications/read-all` | Required | Mark all current-user notifications read |

The list is ordered by `createdAt DESC, id DESC`. `page` is zero-based and `size` must be
between 1 and 50. Add `unreadOnly=true` to return unread items only, and use `type` with one
of:

- `USER_FOLLOWED`
- `POST_LIKED`
- `POST_COMMENTED`
- `JOB_APPLICATION_RECEIVED`
- `JOB_APPLICATION_ACCEPTED`
- `JOB_APPLICATION_REJECTED`

Example response:

```json
{
  "content": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "type": "POST_LIKED",
      "entityType": "POST",
      "entityId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "message": "Creative User liked your post.",
      "read": false,
      "readAt": null,
      "createdAt": "2026-07-28T18:00:00Z",
      "actor": {
        "id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
        "username": "creativeuser",
        "fullName": "Creative User",
        "professionalTitle": "Director"
      }
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

The actor is `null` when that account has been deleted. Notification responses never expose
email addresses, password hashes, tokens, or internal deduplication keys.

curl:

```bash
curl "http://localhost:8080/api/v1/notifications?unreadOnly=true&type=POST_LIKED" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl http://localhost:8080/api/v1/notifications/summary \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST http://localhost:8080/api/v1/notifications/$NOTIFICATION_ID/read \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST http://localhost:8080/api/v1/notifications/$NOTIFICATION_ID/unread \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST http://localhost:8080/api/v1/notifications/read-all \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

PowerShell:

```powershell
$headers = @{ Authorization = "Bearer $accessToken" }
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/notifications?unreadOnly=true" `
  -Headers $headers
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/notifications/summary" -Headers $headers
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/notifications/$notificationId/read" `
  -Headers $headers
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/notifications/$notificationId/unread" `
  -Headers $headers
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/notifications/read-all" `
  -Headers $headers
```

## Search API

Search is public and operates directly on the existing users, profiles, posts, works, and jobs
tables. When a valid bearer token is supplied, viewer-specific fields such as
`followedByCurrentUser`, `likedByCurrentUser`, and `ownedByCurrentUser` are populated.

| Method | Endpoint | Search and filters |
| --- | --- | --- |
| `GET` | `/api/v1/search` | Combined results; `q`, `limitPerType` (1–10) |
| `GET` | `/api/v1/search/users` | Username, full name, title, location |
| `GET` | `/api/v1/search/posts` | Content and author; optional `authorUsername` |
| `GET` | `/api/v1/search/works` | Title, description, owner; optional `workType`, `ownerUsername`, `releaseYear` |
| `GET` | `/api/v1/search/jobs` | Title, description, location, owner; optional `category`, `workMode`, `status`, `compensationType`, `ownerUsername` |

`q` is trimmed, repeated whitespace is collapsed, and matching is case-insensitive. It must
contain 2–100 characters. Literal `%` and `_` characters are escaped rather than interpreted as
SQL wildcards. `page` starts at zero and `size` must be 1–50. Invalid queries, pagination, and
filters return `INVALID_SEARCH_QUERY`, `INVALID_SEARCH_PAGINATION`, and
`INVALID_SEARCH_FILTER`, respectively. An unknown optional username filter returns an empty
page.

User ranking places exact usernames first, then username prefixes, full-name matches, and
professional-title/location matches. Remaining ties use username and UUID ascending. Posts,
works, and jobs use `createdAt DESC, id DESC`; jobs default to `OPEN` unless `status` is
explicitly supplied.

Combined response:

```json
{
  "query": "editor",
  "users": { "content": [], "totalElements": 0 },
  "posts": { "content": [], "totalElements": 0 },
  "works": { "content": [], "totalElements": 0 },
  "jobs": { "content": [], "totalElements": 0 }
}
```

curl:

```bash
curl "http://localhost:8080/api/v1/search?q=editor&limitPerType=5"
curl "http://localhost:8080/api/v1/search/users?q=director&page=0&size=20"
curl "http://localhost:8080/api/v1/search/posts?q=montage&authorUsername=creativeuser"
curl "http://localhost:8080/api/v1/search/works?q=film&workType=SHORT_FILM&releaseYear=2026"
curl "http://localhost:8080/api/v1/search/jobs?q=editor&category=PROFESSIONAL&workMode=REMOTE"
```

PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/search?q=editor&limitPerType=5"
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/search/users?q=director&page=0&size=20"
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/search/jobs?q=editor&category=PROFESSIONAL&workMode=REMOTE"
```

The current implementation is bounded substring search. No search-index migration was added:
ordinary B-tree indexes do not accelerate leading-wildcard matches, while enabling `pg_trgm`
and building several GIN indexes would add migration and write costs that are premature for the
current dataset. At larger scale, measure representative queries first, then introduce a focused
`pg_trgm` index set, PostgreSQL full-text search, or a dedicated search engine.

## Direct messaging API

All messaging endpoints require a bearer access token.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/api/v1/conversations` | Start or reuse a direct conversation by username |
| `GET` | `/api/v1/conversations` | List the current user's conversations |
| `GET` | `/api/v1/conversations/{conversationId}` | Get one participant conversation |
| `POST` | `/api/v1/conversations/{conversationId}/messages` | Send a text message |
| `GET` | `/api/v1/conversations/{conversationId}/messages` | List messages newest first |
| `POST` | `/api/v1/conversations/{conversationId}/read` | Mark the current participant read |
| `GET` | `/api/v1/messaging/summary` | Return unread conversation/message totals |

Starting a conversation is order-independent. The same two users always resolve to one
deterministic direct conversation; the first request returns `201 Created` and subsequent requests
return `200 OK`. Self-conversations are rejected.

```json
{
  "username": "creativeuser"
}
```

Messages are trimmed, must not be blank, and may contain at most 5000 characters:

```json
{
  "content": "Hello"
}
```

Conversation pages default to 20 items with a maximum of 50. Message pages default to 30 with a
maximum of 100 and are ordered by `createdAt DESC, id DESC`; clients can reverse the current page
for chronological display.

Unread state uses one `lastReadAt` timestamp per conversation participant. An incoming message is
unread when it is strictly newer than that timestamp. The current user's own messages never count
as unread. Marking read changes only the requesting participant and uses a UTC application
timestamp.

curl:

```bash
curl -X POST http://localhost:8080/api/v1/conversations \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"username":"creativeuser"}'
curl http://localhost:8080/api/v1/conversations \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST http://localhost:8080/api/v1/conversations/$CONVERSATION_ID/messages \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"Hello"}'
curl "http://localhost:8080/api/v1/conversations/$CONVERSATION_ID/messages?page=0&size=30" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST http://localhost:8080/api/v1/conversations/$CONVERSATION_ID/read \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl http://localhost:8080/api/v1/messaging/summary \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

PowerShell:

```powershell
$headers = @{ Authorization = "Bearer $accessToken" }
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/conversations" `
  -Headers $headers -ContentType "application/json" `
  -Body (@{ username = "creativeuser" } | ConvertTo-Json)
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/conversations" -Headers $headers
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/conversations/$conversationId/messages" `
  -Headers $headers -ContentType "application/json" `
  -Body (@{ content = "Hello" } | ConvertTo-Json)
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/conversations/$conversationId/read" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/messaging/summary" -Headers $headers
```

Only participants can access or send to a conversation. Responses expose public usernames,
names, and professional titles only. Deleted senders remain represented safely as `sender: null`.
Group chat, attachments, editing, deletion, encryption, WebSockets, typing/online state, and
push notifications are not implemented. Messaging unread totals are independent of the polling
notification table.
# Media upload foundation

Aksiyoncuk stores image metadata and ownership in PostgreSQL and binary bytes in an
S3-compatible object store. Local development uses MinIO from the root
`compose.yaml`; production can use AWS S3, Cloudflare R2, or another compatible
service through the same `MediaStorage` abstraction.

Set `MEDIA_STORAGE_ENDPOINT`, `MEDIA_STORAGE_REGION`,
`MEDIA_STORAGE_ACCESS_KEY`, `MEDIA_STORAGE_SECRET_KEY`,
`MEDIA_STORAGE_BUCKET`, `MEDIA_PUBLIC_BASE_URL`, and
`MEDIA_PATH_STYLE_ACCESS`. `docker compose up -d` starts PostgreSQL and MinIO;
the one-shot `minio-init` service safely creates the bucket if missing and
enables public downloads without deleting existing objects. The MinIO API and
console default to ports 9000 and 9001.

The initial access model is public-read media with authenticated, owner-only
mutation. API responses expose public URLs and never storage keys, bucket names,
or credentials. Supported files are signature-verified JPEG, PNG, and WebP.
SVG, HTML, executables, empty files, and MIME/signature mismatches are rejected.
Limits are 5 MB for avatars, 10 MB for covers and post images, and 15 MB for
work images. Posts support four images and works support twelve.

Endpoints:

- `POST /api/v1/media/profile/avatar` and `/cover` replace profile media.
- `DELETE /api/v1/media/profile/avatar` and `/cover` are idempotent.
- `POST /api/v1/posts/{postId}/media` and `/works/{workId}/media` upload images.
- `DELETE /api/v1/posts/{postId}/media/{mediaId}` and the equivalent work route
  remove an image.
- `PUT /api/v1/posts/{postId}/media/order` and the equivalent work route accept
  `{"mediaIds":["uuid", "..."]}` containing the complete current set.

Multipart uploads use the `file` field:

```bash
curl -X POST http://localhost:8080/api/v1/media/profile/avatar \
  -H "Authorization: Bearer $TOKEN" -F "file=@avatar.jpg;type=image/jpeg"
```

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/v1/media/profile/avatar" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Form @{ file = Get-Item ".\avatar.jpg" }
```

Uploads validate before generating a date-partitioned UUID object key. The
object is uploaded first, then metadata and its relation are committed. A
database failure triggers best-effort object deletion. Replacement uploads the
new object before atomically changing the profile reference. Removed assets are
soft-deleted in PostgreSQL; object deletion runs after commit, and cleanup
failure is logged without restoring a user-visible relation. Parent rows are
pessimistically locked so concurrent uploads cannot bypass limits.

Original bytes are preserved without recompression. EXIF metadata, including
possible location information, is not removed yet. Production deployments
should add antivirus/content scanning and an orphan-cleanup reconciliation job.
Future video work should use a separate private ingest bucket, asynchronous
scanning/transcoding jobs, rendition manifests, CDN delivery, and authorization
appropriate for streaming; it should not overload this image upload path.
# Freelance Marketplace Phase 1

## Private delivery attachments

Deliveries and redeliveries may include up to five private JPEG, PNG, WebP, PDF, plain-text, or ZIP files, limited to 25 MB each and 75 MB total. They are stored in the non-public `app.media.private-bucket`, remain associated with immutable delivery history, and are listed or downloaded only after buyer/seller authorization. Downloads are proxied by the authenticated backend; responses never contain bucket names, storage keys, or public object URLs.

The multipart delivery action uses an `application/json` `request` part and repeated `files` parts. Supported binary formats receive signature checks in addition to MIME and extension validation. Uploaded objects are compensated when an upload or database transaction fails. This validation is not malware scanning and provides no malware-safety guarantee.

Local smoke verification uses `docker compose up -d postgres minio minio-init`, then the backend dev profile and the frontend development server. Through the normal UI, create seller, buyer, and unrelated accounts; publish a service, create and start an order, and deliver a generated PNG, PDF, and ZIP. Confirm both participants see and download identical bytes, the unrelated account receives an authorization error, and completed or cancelled orders reject another delivery. Inspect MinIO only with authenticated local tooling: delivery objects must exist solely in `MEDIA_PRIVATE_STORAGE_BUCKET`, anonymous list/read requests must fail, and the public media bucket must retain its existing anonymous-read behavior. Stop application processes after the check while leaving PostgreSQL and MinIO healthy.

The Phase 1 marketplace is implemented under `/api/v1/freelance`. It reuses the existing users,
profiles, works, media storage, direct messaging, notifications, authentication, and structured
API error response. No payment provider, escrow, wallet, refund, tax, invoice, commission, or
payout behavior exists. An order in `CREATED` state is explicitly **not paid**.

## Marketplace model

Stabilized response guarantees:

- `GET /api/v1/freelance/services/mine` returns owner-safe summaries containing
  lifecycle status, category, primary public thumbnail, lowest active price,
  aggregates, `updatedAt`, and `publishedAt` without per-listing queries.
- Service work references contain a nullable public `thumbnailUrl`; storage keys
  and bucket details are never serialized.
- Order responses retain `pendingCancellation` and also expose deterministic
  `cancellationHistory`, including rejected, withdrawn, and accepted requests
  with safe requester/resolver roles.

- Active, public categories are available from `GET /api/v1/freelance/categories`. V15 seeds
  stable Turkish slugs for design, animation, software, writing, audio, marketing, photography,
  stage arts, and film production.
- Seller listings start as `DRAFT`, can become `PUBLISHED`, may be `PAUSED`, and can be terminally
  `ARCHIVED`. Publishing requires an active category and at least one active package.
- A listing has one to three `BASIC`, `STANDARD`, and `PREMIUM` packages. Package prices use
  `NUMERIC(19,2)`/`BigDecimal`, are currently restricted to `TRY`, and include server-validated
  delivery days and revision counts.
- Up to six seller-owned portfolio works can be linked. The complete ordered work ID set is
  replaced transactionally during listing edits.
- Up to eight JPEG, PNG, or WebP images (15 MB each) can be uploaded with multipart field `file`
  through `POST /api/v1/freelance/services/{serviceId}/media`. Delete and complete-list reorder
  endpoints follow the existing post/work media API. Images use the shared S3-compatible storage,
  validation, compensation, and public-URL strategy; storage keys are never returned.

Public search is `GET /api/v1/freelance/services` and supports `q`, `category`, `seller`,
`minPrice`, `maxPrice`, `deliveryDaysMax`, `minimumRating`, `packageTier`, `page`, `size`, and
`sort`. Sort values are `NEWEST`, `RATING_DESC`, `PRICE_ASC`, `PRICE_DESC`, `DELIVERY_ASC`, and
`POPULAR`. Only published listings are returned, with deterministic ID tie-breaking and a maximum
page size of 50.

## Order workflow

```text
CREATED -> IN_PROGRESS -> DELIVERED -> COMPLETED
                         DELIVERED -> REVISION_REQUESTED -> IN_PROGRESS
CREATED | IN_PROGRESS | DELIVERED | REVISION_REQUESTED
  -> CANCELLATION_REQUESTED -> CANCELLED or previous state
```

The buyer selects a package, but price, currency, delivery time, revision allowance, buyer/seller,
and listing identity are derived server-side and copied into an immutable historical snapshot.
The seller explicitly starts an order; only then is its UTC due date calculated. Deliveries are
immutable plain-text records. A buyer revision request consumes one allowance transactionally,
then the seller explicitly acknowledges it before redelivery.

Either party can create one pending cancellation request. Only the other party accepts/rejects;
only its requester withdraws. Reject/withdraw restores the recorded previous state. Acceptance
cancels without claiming a refund. Completed and cancelled orders are immutable.

The buyer can review a completed order once. Rating is 1–5; service average/count are recalculated
inside the review transaction with two-decimal rounding. Order requirements and histories are
visible only to the buyer and seller.

`POST /api/v1/freelance/services/{serviceId}/conversation` creates or reuses the existing direct
conversation with the seller and never sends an automatic message. Important order, delivery,
revision, cancellation, completion, rejection, and review events use the existing idempotent
notification system.

## Concurrency and security

All mutations require bearer authentication and derive the actor from the JWT principal.
Listing/order row locks serialize package replacement, publishing, media limits, and state
transitions. Unique constraints protect package tiers/order, order numbers, one review per order,
revision sequences, and the partial one-pending-cancellation invariant. Version columns preserve a
future optimistic-lock contract. Ownership and buyer/seller roles are checked in the transactional
service; unrelated users receive structured 403 responses.

Public listing media is publicly readable. Do not upload sensitive images; image EXIF/GPS metadata
is currently preserved and antivirus scanning is not claimed. Phase 2 can add payment authorization
and escrow state, disputes/refunds, commission/payout accounting, richer delivery attachments,
administrative category management, and event-driven WebSocket updates without replacing these
snapshot and state-machine foundations.

### Examples

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"serviceId":"SERVICE_UUID","packageId":"PACKAGE_UUID","requirements":"Detailed requirements here"}' \
  http://localhost:8080/api/v1/freelance/orders

curl -H "Authorization: Bearer $TOKEN" -F "file=@listing.webp;type=image/webp" \
  http://localhost:8080/api/v1/freelance/services/SERVICE_UUID/media
```

```powershell
Invoke-RestMethod -Method Post -Uri "$Api/api/v1/freelance/orders" `
  -Headers @{ Authorization = "Bearer $Token" } -ContentType "application/json" `
  -Body (@{ serviceId=$ServiceId; packageId=$PackageId; requirements="Detailed requirements here" } | ConvertTo-Json)

curl.exe -H "Authorization: Bearer $Token" -F "file=@listing.webp;type=image/webp" `
  "$Api/api/v1/freelance/services/$ServiceId/media"
```
