#!/usr/bin/env bash

set -euo pipefail

declare -a child_pids=()

cleanup() {
  for pid in "${child_pids[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait || true
}

trap cleanup SIGTERM SIGINT EXIT

mkdir -p /tmp/prometheus /tmp/loki /tmp/tempo /tmp/grafana/logs /tmp/grafana/plugins

tempo --config.file /etc/tempo/tempo.yaml &
child_pids+=($!)

loki --config.file /etc/loki/loki-config.yaml &
child_pids+=($!)

prometheus \
  --config.file=/etc/prometheus/prometheus.yaml \
  --storage.tsdb.path=/tmp/prometheus \
  --storage.tsdb.retention.time=6h \
  --web.enable-lifecycle \
  --web.enable-admin-api \
  &
child_pids+=($!)

alloy run --stability.level=experimental --log.level=warn /etc/alloy/config.river &
child_pids+=($!)

grafana server \
  --homepath=/opt/grafana \
  --config=/etc/grafana/grafana.ini \
  &
child_pids+=($!)

wait -n "${child_pids[@]}"
