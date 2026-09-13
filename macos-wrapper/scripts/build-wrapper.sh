#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WRAPPER_DIR="${REPO_DIR}/macos-wrapper"
BUILD_DIR="${WRAPPER_DIR}/build"
APP_NAME="Starsilk System Planner"
APP_BUNDLE="${BUILD_DIR}/${APP_NAME}.app"
CONTENTS_DIR="${APP_BUNDLE}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"
CACHE_DIR="${BUILD_DIR}/.cache"

echo "=== Building ${APP_NAME}.app ==="

# 1. Ensure production web bundle is built and verified fresh
if ! /opt/homebrew/bin/node "${REPO_DIR}/scripts/check-build-freshness.mjs" >/dev/null 2>&1; then
  echo "Web distribution is missing or stale. Building fresh distribution (npm run build)..."
  (cd "${REPO_DIR}" && npm run build)
else
  echo "Verified fresh web distribution matching current source."
fi

# 2. Ensure icon exists
if [[ ! -f "${WRAPPER_DIR}/resources/AppIcon.icns" ]]; then
  echo "Generating AppIcon.icns..."
  "${WRAPPER_DIR}/scripts/create-icns.sh"
else
  echo "Verified AppIcon.icns at ${WRAPPER_DIR}/resources/AppIcon.icns"
fi

# 3. Prepare fresh bundle structure
rm -rf "${APP_BUNDLE}"
mkdir -p "${MACOS_DIR}" "${RESOURCES_DIR}" "${CACHE_DIR}"

# 4. Copy Info.plist and Resources
echo "Copying bundle metadata and assets..."
cp "${WRAPPER_DIR}/resources/Info.plist" "${CONTENTS_DIR}/Info.plist"
cp "${WRAPPER_DIR}/resources/AppIcon.icns" "${RESOURCES_DIR}/AppIcon.icns"

# 5. Compile Swift Native Wrapper Binary
echo "Compiling native Swift binary..."
/usr/bin/swiftc -O \
  -framework Cocoa \
  -framework WebKit \
  -module-cache-path "${CACHE_DIR}" \
  "${WRAPPER_DIR}/src/main.swift" \
  -o "${MACOS_DIR}/${APP_NAME}"

chmod +x "${MACOS_DIR}/${APP_NAME}"

# 6. Validate Bundle Structure
echo "Validating application bundle..."
/usr/bin/plutil -lint "${CONTENTS_DIR}/Info.plist" >/dev/null
test -x "${MACOS_DIR}/${APP_NAME}"
test -f "${RESOURCES_DIR}/AppIcon.icns"

BUNDLE_SIZE=$(du -sh "${APP_BUNDLE}" | cut -f1)
BIN_SIZE=$(wc -c < "${MACOS_DIR}/${APP_NAME}" | tr -d ' ')
echo "=== Build Complete! ==="
echo "Bundle: ${APP_BUNDLE}"
echo "Binary size: ${BIN_SIZE} bytes"
echo "Total bundle size: ${BUNDLE_SIZE}"
