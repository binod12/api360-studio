#!/bin/bash
# ==============================================================================
# Shift-Left Security: Local Semgrep SAST 
# This runs the EXACT SAME scanning engine locally as the GitHub Actions CI/CD.
# Requires Docker Desktop.
# ==============================================================================

set -e

echo "🔒 Starting API360 Local Static Application Security Testing (SAST)"
echo "Pulling latest Semgrep definitions..."

# We mount the monolithic repository ROOT into the Semgrep container at /src
# This ensures it scans both the main Web App and the VS Code Extension.
docker run --rm \
  --name api360-sast \
  -v "${PWD}:/src" \
  -w /src \
  returntocorp/semgrep \
  semgrep ci \
  --config=p/default

echo ""
echo "✅ SAST Scan Complete! No local vulnerabilities detected."
