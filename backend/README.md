# Aksiyoncuk Backend

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
  "ownedByCurrentUser": true
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
`POST_DELETE_FORBIDDEN`. Media, likes, comments, reposts, editing, and
moderation are not implemented yet.

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
├── post             Post feature (future)
├── work             Portfolio work feature (future)
└── job              Job feature (future)
```

Future feature packages should own their controllers, DTOs, services, repositories, entities, and mappers. Controllers must expose DTOs rather than JPA entities. Database changes must be introduced through versioned Flyway migrations.

## Operational endpoints

Only Actuator health is exposed over HTTP:

```text
GET /actuator/health
```

Health details are not returned publicly. Other Actuator endpoints remain unexposed.
