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

Production uses the same required database environment variables with the `prod` profile. API documentation is disabled in that profile:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## Tests

Tests use an in-memory H2 database and do not require PostgreSQL:

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
├── auth             Authentication feature (future)
├── user             User feature (future)
├── profile          Profile feature (future)
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
