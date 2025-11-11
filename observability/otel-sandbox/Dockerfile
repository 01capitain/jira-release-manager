FROM debian:12-slim

ARG TEMPO_VERSION=2.9.0
ARG LOKI_VERSION=3.5.7
ARG PROMETHEUS_VERSION=3.7.3
ARG GRAFANA_VERSION=12.2.1
ARG GRAFANA_ALLOY_VERSION=1.11.3
ARG TARGETARCH
ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive \
    GF_SERVER_HTTP_PORT=3001 \
    GF_PATHS_PROVISIONING=/etc/grafana/provisioning \
    GF_PATHS_DATA=/tmp/grafana \
    GF_PATHS_LOGS=/tmp/grafana/logs \
    GF_PATHS_PLUGINS=/tmp/grafana/plugins \
    GF_SECURITY_ADMIN_PASSWORD=admin

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl tar unzip tini \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    mkdir -p /opt/tempo /opt/loki /opt/prometheus /opt/alloy /opt/grafana; \
    mkdir -p /etc/tempo /etc/loki /etc/prometheus /etc/alloy /etc/grafana/provisioning/datasources /etc/grafana/provisioning/dashboards; \
    mkdir -p /tmp/prometheus /tmp/loki /tmp/tempo /tmp/grafana/logs /tmp/grafana/plugins /data-alloy; \
    groupadd --system grafana; \
    useradd --system --home-dir /tmp/grafana --gid grafana grafana; \
    chown -R grafana:grafana /tmp/prometheus /tmp/loki /tmp/tempo /tmp/grafana /data-alloy

RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) tempo_assets="tempo-${TEMPO_VERSION}.linux-amd64.tar.gz tempo_${TEMPO_VERSION}_linux_amd64.tar.gz" ;; \
      arm64) tempo_assets="tempo-${TEMPO_VERSION}.linux-arm64.tar.gz tempo_${TEMPO_VERSION}_linux_arm64.tar.gz" ;; \
      *) echo "Unsupported architecture for Tempo: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    base_url="https://github.com/grafana/tempo/releases/download/v${TEMPO_VERSION}"; \
    mkdir -p /tmp/tempo-dist; \
    for asset in ${tempo_assets}; do \
      if curl -fsSL "${base_url}/${asset}" -o /tmp/tempo.tar.gz; then \
        tar -xzf /tmp/tempo.tar.gz -C /tmp/tempo-dist; \
        break; \
      fi; \
    done; \
    tempo_path="$(find /tmp/tempo-dist -type f -name 'tempo' -print | head -n1)"; \
    if [ -z "${tempo_path}" ]; then \
      echo "Tempo binary not found in release artifact"; \
      exit 1; \
    fi; \
    install -m 755 "${tempo_path}" /opt/tempo/tempo; \
    rm -rf /tmp/tempo.tar.gz /tmp/tempo-dist

RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) loki_asset="loki-linux-amd64.zip" ;; \
      arm64) loki_asset="loki-linux-arm64.zip" ;; \
      *) echo "Unsupported architecture for Loki: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    base_url="https://github.com/grafana/loki/releases/download/v${LOKI_VERSION}"; \
    mkdir -p /tmp/loki-dist; \
    curl -fsSL "${base_url}/${loki_asset}" -o /tmp/loki.zip; \
    unzip -q /tmp/loki.zip -d /tmp/loki-dist; \
    loki_path="$(find /tmp/loki-dist -type f -name 'loki*' -print | head -n1)"; \
    if [ -z "${loki_path}" ]; then \
      echo "Loki binary not found in release artifact"; \
      exit 1; \
    fi; \
    install -m 755 "${loki_path}" /opt/loki/loki; \
    rm -rf /tmp/loki.zip /tmp/loki-dist

RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) prometheus_asset="prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz" ;; \
      arm64) prometheus_asset="prometheus-${PROMETHEUS_VERSION}.linux-arm64.tar.gz" ;; \
      *) echo "Unsupported architecture for Prometheus: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/${prometheus_asset}" -o /tmp/prometheus.tar.gz; \
    mkdir -p /tmp/prometheus-dist; \
    tar -xzf /tmp/prometheus.tar.gz -C /tmp/prometheus-dist; \
    prometheus_bin="$(find /tmp/prometheus-dist -type f -name 'prometheus' -print | head -n1)"; \
    promtool_bin="$(find /tmp/prometheus-dist -type f -name 'promtool' -print | head -n1)"; \
    if [ -z "${prometheus_bin}" ] || [ -z "${promtool_bin}" ]; then \
      echo "Prometheus binaries not found in release artifact"; \
      exit 1; \
    fi; \
    install -m 755 "${prometheus_bin}" /opt/prometheus/prometheus; \
    install -m 755 "${promtool_bin}" /opt/prometheus/promtool; \
    rm -rf /tmp/prometheus.tar.gz /tmp/prometheus-dist

RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) alloy_asset="alloy-linux-amd64.zip" ;; \
      arm64) alloy_asset="alloy-linux-arm64.zip" ;; \
      *) echo "Unsupported architecture for Alloy: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    base_url="https://github.com/grafana/alloy/releases/download/v${GRAFANA_ALLOY_VERSION}"; \
    mkdir -p /tmp/alloy-dist; \
    curl -fsSL "${base_url}/${alloy_asset}" -o /tmp/alloy.zip; \
    unzip -q /tmp/alloy.zip -d /tmp/alloy-dist; \
    alloy_path="$(find /tmp/alloy-dist -type f -name 'alloy*' -print | head -n1)"; \
    if [ -z "${alloy_path}" ]; then \
      echo "Alloy binary not found in release artifact"; \
      exit 1; \
    fi; \
    install -m 755 "${alloy_path}" /opt/alloy/alloy; \
    rm -rf /tmp/alloy.zip /tmp/alloy-dist

RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) grafana_asset="grafana-${GRAFANA_VERSION}.linux-amd64.tar.gz" ;; \
      arm64) grafana_asset="grafana-${GRAFANA_VERSION}.linux-arm64.tar.gz" ;; \
      *) echo "Unsupported architecture for Grafana: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    curl -fsSL "https://dl.grafana.com/oss/release/${grafana_asset}" -o /tmp/grafana.tar.gz; \
    tar -xzf /tmp/grafana.tar.gz -C /opt/grafana --strip-components=1; \
    rm -rf /tmp/grafana.tar.gz

COPY observability/otel-sandbox/alloy/config.river /etc/alloy/config.river
COPY observability/otel-sandbox/tempo/tempo.yaml /etc/tempo/tempo.yaml
COPY observability/otel-sandbox/loki/loki-config.yaml /etc/loki/loki-config.yaml
COPY observability/otel-sandbox/prometheus/prometheus.yaml /etc/prometheus/prometheus.yaml
COPY observability/otel-sandbox/grafana/grafana.ini /etc/grafana/grafana.ini
COPY observability/otel-sandbox/grafana/provisioning /etc/grafana/provisioning
COPY observability/otel-sandbox/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && ln -s /opt/tempo/tempo /usr/local/bin/tempo \
    && ln -s /opt/loki/loki /usr/local/bin/loki \
    && ln -s /opt/prometheus/prometheus /usr/local/bin/prometheus \
    && ln -s /opt/alloy/alloy /usr/local/bin/alloy \
    && ln -s /opt/grafana/bin/grafana /usr/local/bin/grafana
USER grafana

EXPOSE 4317 4318 3001 3100 3200 9090 9464

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
