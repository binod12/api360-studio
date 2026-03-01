#!/bin/bash
# ==============================================================================
# Shift-Left Security: Local OWASP ZAP DAST 
# This executes a dynamic baseline scan against a locally hosted Vite bundle.
# Requires Docker Desktop.
# ==============================================================================

set -e

# Config
PORT=5173
VITE_DIR="api360"
ZAP_REPORT_DIR="${PWD}/.zap_reports"
mkdir -p "$ZAP_REPORT_DIR"

echo "🔒 Starting API360 Local Dynamic Application Security Testing (DAST)"

# 1. Start the React app in a background daemon
echo "🔨 Building and serving production bundle..."
cd "$VITE_DIR"
npm run build
npx vite preview --port $PORT &
VITE_PID=$!
cd ..

echo "⏳ Waiting for Vite server to boot on http://localhost:${PORT}..."
npx wait-on http://localhost:${PORT} -t 10000

# 2. Execute Dockerized ZAP Scan
# Since Docker runs in an isolated VM, `localhost` from inside the container maps to the container itself.
# On MacOS/Windows, we must use `host.docker.internal` to route traffic back out to the host Vite server port.
# On Linux natively, `--network host` is required. We default to Mac/Win.
# The `-t` target flag receives the host DNS bridge.
TARGET_URL="http://host.docker.internal:${PORT}"

echo "🕷️ Initializing OWASP ZAP against ${TARGET_URL}"
# Baseline scan allows issues without necessarily blocking code (matching the GH Action policy)
docker run --rm \
  --name api360-dast \
  -v "$ZAP_REPORT_DIR":/zap/wrk/:rw \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "$TARGET_URL" -r report_local.html -I

# 3. Teardown
echo "🧹 Tearing down local Vite preview server (PID: $VITE_PID)..."
kill $VITE_PID

echo ""
echo "✅ DAST Scan Complete!"
echo "📄 Report generated at: ${ZAP_REPORT_DIR}/report_local.html"
