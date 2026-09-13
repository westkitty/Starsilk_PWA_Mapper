#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SOURCE_SVG="${REPO_DIR}/public/pwa-512x512.svg"
OUTPUT_DIR="${REPO_DIR}/macos-wrapper/resources"
ICONSET_DIR="${OUTPUT_DIR}/AppIcon.iconset"
OUTPUT_ICNS="${OUTPUT_DIR}/AppIcon.icns"

if [[ ! -f "${SOURCE_SVG}" ]]; then
  echo "Error: Source SVG not found at ${SOURCE_SVG}" >&2
  exit 1
fi

mkdir -p "${ICONSET_DIR}"

echo "Rendering iconset from ${SOURCE_SVG}..."

# Standard Apple iconset sizes
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 16x16     "${ICONSET_DIR}/icon_16x16.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 32x32     "${ICONSET_DIR}/icon_16x16@2x.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 32x32     "${ICONSET_DIR}/icon_32x32.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 64x64     "${ICONSET_DIR}/icon_32x32@2x.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 128x128   "${ICONSET_DIR}/icon_128x128.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 256x256   "${ICONSET_DIR}/icon_128x128@2x.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 256x256   "${ICONSET_DIR}/icon_256x256.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 512x512   "${ICONSET_DIR}/icon_256x256@2x.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 512x512   "${ICONSET_DIR}/icon_512x512.png"
/opt/homebrew/bin/magick -background none "${SOURCE_SVG}" -resize 1024x1024 "${ICONSET_DIR}/icon_512x512@2x.png"

echo "Compiling AppIcon.icns via iconutil..."
/usr/bin/iconutil -c icns "${ICONSET_DIR}" -o "${OUTPUT_ICNS}"
rm -rf "${ICONSET_DIR}"

echo "Successfully generated: ${OUTPUT_ICNS} ($(wc -c < "${OUTPUT_ICNS}" | tr -d ' ') bytes)"
