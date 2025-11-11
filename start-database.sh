#!/usr/bin/env bash
# Use this script to start all local infrastructure (Postgres + telemetry stack)
# using Docker Compose so everything appears under a single "jira-release-manager"
# project inside Docker Desktop / Podman Desktop.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo ".env file not found. Copy .env.example to .env and configure DATABASE_URL before continuing."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set in $ENV_FILE"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to parse DATABASE_URL. Please ensure Node is installed."
  exit 1
fi

parse_output=$(
  DATABASE_URL="$DATABASE_URL" node -e '
    if (!process.env.DATABASE_URL) {
      process.exit(1);
    }
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, "").split("?")[0];
    const username = url.username || "postgres";
    const password = url.password || "password";
    const host = url.hostname || "localhost";
    const port = url.port || "5432";
    process.stdout.write(
      `${username} ${password} ${host} ${port} ${dbName || "jira-release-manager"}`
    );
  '
)

if [ -z "$parse_output" ]; then
  echo "Unable to parse DATABASE_URL. Ensure it is a valid connection string."
  exit 1
fi

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<<"$parse_output"

if [ "$DB_PASSWORD" = "password" ]; then
  echo "You are using the default database password"
  read -p "Should we generate a random password for you? [y/N]: " -r REPLY
  if ! [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Please change the default password in the .env file and try again"
    exit 1
  fi
  DB_PASSWORD=$(openssl rand -base64 12 | tr '+/' '-_')
  sed -i '' "s#:password@#:$DB_PASSWORD@#" "$ENV_FILE"
  echo "Updated DATABASE_URL with a random password."
fi

if command -v nc >/dev/null 2>&1; then
  if [[ "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" ]]; then
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
      echo "Port $DB_PORT is already in use."
      exit 1
    fi
  fi
else
  echo "Warning: Unable to check if port $DB_PORT is already in use (netcat not installed)"
  read -p "Do you want to continue anyway? [y/N]: " -r REPLY
  if ! [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborting."
    exit 1
  fi
fi

declare -a COMPOSE_CMD=()
ORCHESTRATOR=""

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
  ORCHESTRATOR="docker"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
  ORCHESTRATOR="docker"
elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(podman compose)
  ORCHESTRATOR="podman"
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(podman-compose)
  ORCHESTRATOR="podman"
fi

if [ -z "${COMPOSE_CMD[*]:-}" ]; then
  echo "Docker Compose v2 or Podman Compose is required. Install Docker Desktop or Podman with compose support."
  exit 1
fi

if ! "$ORCHESTRATOR" info >/dev/null 2>&1; then
  echo "$ORCHESTRATOR daemon is not running. Please start $ORCHESTRATOR and try again."
  exit 1
fi

remove_leftover_container() {
  local container_name="$1"
  if "$ORCHESTRATOR" ps -a --format '{{.Names}}' | grep -Fxq "$container_name"; then
    echo "Removing leftover container '$container_name' to avoid naming conflicts."
    "$ORCHESTRATOR" rm -f "$container_name" >/dev/null
  fi
}

remove_leftover_container "jira-release-manager-postgres"
remove_leftover_container "jira-release-manager-telemetry"

export DB_USER DB_PASSWORD DB_NAME DB_PORT
export COMPOSE_PROJECT_NAME="jira-release-manager"

"${COMPOSE_CMD[@]}" up -d postgres observability

echo "Infrastructure containers are running under the 'jira-release-manager' project."
