#!/usr/bin/env bash
# Compatibility wrapper: use the shared infrastructure stack (../infrastructure)
# and provision the jira-release-manager database/user on that shared Postgres.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/../../infrastructure" && pwd)"

echo "Starting shared infrastructure (Traefik/Postgres/Loki/Grafana/Fizzy)..."
(cd "$INFRA_DIR" && ./start-development-environment)

echo "Ensuring jira-release-manager DB and user exist on shared Postgres..."
"$SCRIPT_DIR/scripts/setup-shared-postgres.sh"

echo "Done. Update DATABASE_URL in .env if needed and start the app (pnpm dev)."
