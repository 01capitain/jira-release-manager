# Jira Release Manager

## Tools

### Code Rabbit

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/01capitain/jira-release-manager?utm_source=oss&utm_medium=github&utm_campaign=01capitain%2Fjira-release-manager&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## Tech Stack

### Language

[Next.js](https://nextjs.org)

### Styling

[Tailwind CSS](https://tailwindcss.com)

### Database

PostgreSQL 18, running inside the shared Docker Compose project.

Set up with `./start-database.sh`, which now boots Postgres and the telemetry stack together under the `jira-release-manager` project.

### ORM

[Prisma](https://prisma.io)

### Linter

Eslint + [Prettier](https://prettier.io/)

### Testing

[Jest](https://jestjs.io/)

Run tests with `pnpm test`.

### Authorization

[NextAuth.js](https://next-auth.js.org)

#### Discord oAuth

Find how to set up discord OAuth in the [First steps on t3.gg](https://create.t3.gg/en/usage/first-steps). _Caveat:_ The OAuth callback is set up to redirect to localhost:3000
If that port is changed you need to also update the webhook within the [Discord setup](https://discord.com/developers/applications/1411074365621145772/oauth2).

## How do I deploy this?

Follow our deployment guides for [Docker](https://create.t3.gg/en/deployment/docker) for more information.

## Local Telemetry Sandbox

Run the entire Grafana Alloy + Tempo + Loki + Prometheus + Grafana stack from the single Dockerfile. Credentials are configurable via `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` (defaults: `admin` / `hotelkit123`).

```bash
# optional: override defaults in your shell or .env
export GRAFANA_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
export GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-hotelkit123}

docker build -f observability/otel-sandbox/Dockerfile -t jira-release-manager-otel .
docker run --rm \
  -e GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin} \
  -e GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-hotelkit123} \
  -p 4318:4318 \
  -p 4317:4317 \
  -p 3001:3001 \
  -p 3200:3200 \
  -p 3100:3100 \
  -p 9090:9090 \
  -p 9464:9464 \
  jira-release-manager-otel
```

Grafana (<http://localhost:3001>, default `admin` / `hotelkit123`) comes pre-provisioned with datasources and the _OTel Sandbox_ dashboard. Because the container writes everything to `/tmp`, telemetry persists only for the container's lifetime.

Set the application exporters to send data to the sandbox:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
export NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
export NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

Need Postgres too? `./start-database.sh` (or `docker compose up -d postgres observability`) still boots both services under the shared `jira-release-manager` project in Docker Desktop / Podman Desktop by reusing the same Dockerfile. These helpers automatically pass the Grafana credentials using the same `GRAFANA_ADMIN_*` environment variables.
If port `5432` is occupied locally, set `DB_PORT` in your `.env` (and match the port in `DATABASE_URL`) before starting the containers so Postgres binds to the custom host port.

Upgrading note: the Postgres 18 image expects its data directory under `/var/lib/postgresql/<major>/main`. The compose file now mounts the volume at `/var/lib/postgresql`; if you used an older mount path, remove the old volume with `docker volume rm jira-release-manager_postgres-data` (or prune volumes) before starting fresh.

## Scripts

This project includes a set of scripts to help with development and maintenance.

| Command               | Description                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`          | Builds the Next.js application for production. The output is stored in the `.next` folder.                                                               |
| `pnpm check`          | Runs all checks, including linting, database schema linting, and type checking. This is a good command to run before committing your code.               |
| `pnpm db:generate`    | Generates a new database migration based on the Prisma schema. This is useful when you have made changes to the `schema.prisma` file.                    |
| `pnpm db:migrate`     | Applies all pending database migrations. This is useful when you have pulled changes from a remote repository that include new migrations.               |
| `pnpm db:push`        | Pushes the Prisma schema to the database without generating a migration. This is useful for small changes to the schema that do not require a migration. |
| `pnpm db:studio`      | Opens the Prisma Studio to view and edit data in the database. This is a useful tool for debugging and testing.                                          |
| `pnpm dev`            | Starts the Next.js development server with Turbopack. This is the command you will use most often during development.                                    |
| `pnpm format:check`   | Checks the formatting of all specified files. This is useful for checking that your code is formatted correctly before committing.                       |
| `pnpm format:write`   | Formats all specified files. This is useful for formatting your code automatically.                                                                      |
| `pnpm postinstall`    | Generates the Prisma Client after installing dependencies. This is run automatically after you run `pnpm install`.                                       |
| `pnpm lint`           | Lints the codebase using Next.js's ESLint configuration. This is useful for finding and fixing errors in your code.                                      |
| `pnpm lint:fix`       | Lints and fixes all auto-fixable issues. This is useful for fixing a large number of linting errors automatically.                                       |
| `pnpm lint:db-schema` | Lints the database schema to disallow boolean fields. This is a custom script that enforces a project-specific convention.                               |
| `pnpm preview`        | Builds and starts the Next.js application in production mode. This is useful for testing the production build on your local machine.                     |
| `pnpm start`          | Starts the Next.js application in production mode. This is the command you will use to run the application in production.                                |
| `pnpm typecheck`      | Checks the TypeScript types without emitting any files. This is useful for checking that your code is type-safe.                                         |
| `pnpm test`           | Runs all tests using Jest. This is useful for ensuring that your code is working correctly.                                                              |
| `pnpm test:db-schema` | Tests the database schema linting script. This is useful for ensuring that the custom linting script is working correctly.                               |
