#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WRAPPER_DIR="${REPO_DIR}/macos-wrapper"
BUILD_DIR="${WRAPPER_DIR}/build"
APP_NAME="Starsilk System Planner"
SOURCE_APP="${BUILD_DIR}/${APP_NAME}.app"
TARGET_DIR="${HOME}/Applications"
TARGET_APP="${TARGET_DIR}/${APP_NAME}.app"
ROLLBACK_DIR="/tmp/Starsilk_Backup_${APP_NAME}.app"
DOCKUTIL="/opt/homebrew/bin/dockutil"

echo "=== Installing ${APP_NAME}.app to ${TARGET_DIR} ==="

# 1. Build if not present or rebuild to guarantee freshness
"${WRAPPER_DIR}/scripts/build-wrapper.sh"

# 2. Ensure target directory exists
mkdir -p "${TARGET_DIR}"

# 3. Preserve rollback backup if an older version exists
if [[ -d "${TARGET_APP}" ]]; then
  echo "Backing up existing installed wrapper to ${ROLLBACK_DIR}..."
  rm -rf "${ROLLBACK_DIR}"
  cp -R "${TARGET_APP}" "${ROLLBACK_DIR}"
fi

# 4. Atomically install the new bundle
echo "Installing new application bundle to ${TARGET_APP}..."
rm -rf "${TARGET_APP}"
cp -R "${SOURCE_APP}" "${TARGET_DIR}/"

# 5. Validate installed artifact
echo "Validating installed bundle..."
/usr/bin/plutil -lint "${TARGET_APP}/Contents/Info.plist" >/dev/null
test -x "${TARGET_APP}/Contents/MacOS/${APP_NAME}"
test -f "${TARGET_APP}/Contents/Resources/AppIcon.icns"

# Touch to trigger LaunchServices cache update
touch "${TARGET_APP}"

echo "Installed successfully at ${TARGET_APP}"

# 6. Configure macOS Dock idempotently
if [[ -x "${DOCKUTIL}" ]]; then
  echo "Checking macOS Dock entry..."
  if "${DOCKUTIL}" --find "${APP_NAME}" >/dev/null 2>&1; then
    echo "Starsilk System Planner is already in macOS Dock."
  else
    echo "Adding Starsilk System Planner to macOS Dock..."
    "${DOCKUTIL}" --add "${TARGET_APP}" --no-restart
    echo "Restarting Dock to apply changes..."
    killall Dock 2>/dev/null || true
  fi
  echo "Current Dock entry:"
  "${DOCKUTIL}" --find "${APP_NAME}" || true
else
  echo "Notice: dockutil not found at ${DOCKUTIL}."
fi

echo "=== Installation & Dock Setup Complete ==="
