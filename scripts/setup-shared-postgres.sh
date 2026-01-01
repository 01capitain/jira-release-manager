#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$(cd "$PROJECT_ROOT/../../infrastructure" && pwd)"
PROJECT_ENV="$PROJECT_ROOT/.env"
INFRA_ENV="$INFRA_DIR/.env"

if [[ ! -f "$PROJECT_ENV" ]]; then
  echo "Missing $PROJECT_ENV. Copy .env.example to .env and set DATABASE_URL before continuing."
  exit 1
fi

if [[ ! -f "$INFRA_ENV" ]]; then
  echo "Missing $INFRA_ENV. Configure the shared infrastructure first (see $INFRA_DIR/README.md)."
  exit 1
fi

if [[ ! -f "$INFRA_DIR/start-development-environment" ]]; then
  echo "Cannot find $INFRA_DIR/start-development-environment. Ensure the shared infra directory exists."
  exit 1
fi

if ! docker network inspect infra >/dev/null 2>&1; then
  echo "Shared network 'infra' not found. Start the shared infra with:"
  echo "  (cd \"$INFRA_DIR\" && ./start-development-environment)"
  exit 1
fi

set -a
source "$PROJECT_ENV"
set +a

parse_output=$(
  DATABASE_URL="${DATABASE_URL:-}" node -e '
    if (!process.env.DATABASE_URL) {
      process.exit(1);
    }
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, "").split("?")[0] || "jira_release_manager";
    const username = url.username || "jira_release_manager";
    const password = url.password || "";
    const host = url.hostname || "localhost";
    const port = url.port || "5432";
    process.stdout.write(
      `${username} ${password} ${host} ${port} ${dbName}`
    );
  '
)

if [[ -z "$parse_output" ]]; then
  echo "Unable to parse DATABASE_URL. Ensure it is a valid connection string."
  exit 1
fi

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<<"$parse_output"

# Use infra Postgres superuser credentials from the infra env (defaults align with .env.example)
set -a
source "$INFRA_ENV"
set +a

POSTGRES_SUPERUSER="${POSTGRES_USER:-postgres}"
POSTGRES_SUPERPASS="${POSTGRES_PASSWORD:-postgres}"

COMPOSE_CMD=(docker compose --env-file "$INFRA_ENV" -f "$INFRA_DIR/docker-compose.yml" -f "$INFRA_DIR/docker-compose.fizzy.yml")

# Ensure Postgres container is running
if ! "${COMPOSE_CMD[@]}" ps --status running --services | grep -qx postgres; then
  echo "Shared Postgres is not running. Start infra first:"
  echo "  (cd \"$INFRA_DIR\" && ./start-development-environment)"
  exit 1
fi

ROLE_SQL=$(cat <<'EOF'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'DB_USER') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L;', :'DB_USER', :'DB_PASSWORD');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L;', :'DB_USER', :'DB_PASSWORD');
  END IF;
END
$$;
EOF
)

DB_EXISTS_SQL=$(cat <<'EOF'
SELECT 1 FROM pg_database WHERE datname = :'DB_NAME';
EOF
)

CREATE_DB_SQL=$(cat <<'EOF'
DO $$
BEGIN
  EXECUTE format('CREATE DATABASE %I OWNER %I;', :'DB_NAME', :'DB_USER');
END
$$;
EOF
)

GRANT_SQL=$(cat <<'EOF'
DO $$
BEGIN
  EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I;', :'DB_NAME', :'DB_USER');
END
$$;
EOF
)

echo "Ensuring role '${DB_USER}' and database '${DB_NAME}' exist on shared Postgres..."

# Create/alter role
PGPASSWORD="$POSTGRES_SUPERPASS" "${COMPOSE_CMD[@]}" exec -T postgres \
  psql -U "$POSTGRES_SUPERUSER" -v ON_ERROR_STOP=1 \
  --set DB_USER="$DB_USER" --set DB_PASSWORD="$DB_PASSWORD" --set DB_NAME="$DB_NAME" \
  -c "$ROLE_SQL" >/dev/null

# Create DB if missing
if ! PGPASSWORD="$POSTGRES_SUPERPASS" "${COMPOSE_CMD[@]}" exec -T postgres \
  psql -U "$POSTGRES_SUPERUSER" -tA \
  --set DB_USER="$DB_USER" --set DB_PASSWORD="$DB_PASSWORD" --set DB_NAME="$DB_NAME" \
  -c "$DB_EXISTS_SQL" | grep -q 1; then
  PGPASSWORD="$POSTGRES_SUPERPASS" "${COMPOSE_CMD[@]}" exec -T postgres \
    psql -U "$POSTGRES_SUPERUSER" -v ON_ERROR_STOP=1 \
    --set DB_USER="$DB_USER" --set DB_PASSWORD="$DB_PASSWORD" --set DB_NAME="$DB_NAME" \
    -c "$CREATE_DB_SQL" >/dev/null
fi

# Grant privileges
PGPASSWORD="$POSTGRES_SUPERPASS" "${COMPOSE_CMD[@]}" exec -T postgres \
  psql -U "$POSTGRES_SUPERUSER" -v ON_ERROR_STOP=1 \
  --set DB_USER="$DB_USER" --set DB_PASSWORD="$DB_PASSWORD" --set DB_NAME="$DB_NAME" \
  -c "$GRANT_SQL" >/dev/null

echo "Done. Update DATABASE_URL in .env if needed:"
echo "postgresql://${DB_USER}:<password>@${DB_HOST}:${DB_PORT}/${DB_NAME}"
