#!/usr/bin/env bash
# ==============================================================================
# Script: upload-e2e-video.sh
# Purpose: Upload E2E recording video (.webm/.mp4) to Google Drive via rclone
#          and echo the direct shareable link for Slack/PR handover.
# Usage: ./upload-e2e-video.sh <path-to-video-file> [optional-custom-name]
# ==============================================================================

set -euo pipefail

VIDEO_FILE="${1:-}"
CUSTOM_NAME="${2:-}"

if [[ -z "$VIDEO_FILE" || ! -f "$VIDEO_FILE" ]]; then
  echo "❌ Error: Video file not found: '$VIDEO_FILE'" >&2
  exit 1
fi

RCLONE_BIN="/usr/local/bin/rclone"
if ! command -v "$RCLONE_BIN" &> /dev/null; then
  RCLONE_BIN="$(which rclone || true)"
fi

if [[ -z "$RCLONE_BIN" || ! -x "$RCLONE_BIN" ]]; then
  echo "❌ Error: rclone binary not found." >&2
  exit 1
fi

TODAY=$(date +"%Y-%m-%d")
TIMESTAMP=$(date +"%H%M%S")
REMOTE_DIR="${E2E_GDRIVE_REMOTE:-gdrive:E2E-Reports}/${TODAY}"

# Determine target filename
BASE_EXT="${VIDEO_FILE##*.}"
if [[ -n "$CUSTOM_NAME" ]]; then
  CLEAN_NAME=$(echo "$CUSTOM_NAME" | tr ' ' '-' | tr -cd '[:alnum:]-_')
  DEST_FILENAME="${CLEAN_NAME}-${TIMESTAMP}.${BASE_EXT}"
else
  DEST_FILENAME="$(basename "$VIDEO_FILE")"
fi

# Create a temporary staged file with target filename if renamed
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

TARGET_FILE="${TMP_DIR}/${DEST_FILENAME}"
cp "$VIDEO_FILE" "$TARGET_FILE"

echo "📤 Uploading '$DEST_FILENAME' to '${REMOTE_DIR}/'..." >&2
"$RCLONE_BIN" copy "$TARGET_FILE" "${REMOTE_DIR}" --stats-one-line

echo "🔗 Generating shareable Google Drive link..." >&2
SHARED_LINK=$("$RCLONE_BIN" link "${REMOTE_DIR}/${DEST_FILENAME}" 2>/dev/null || true)

if [[ -n "$SHARED_LINK" ]]; then
  echo "✅ Upload completed!" >&2
  echo "$SHARED_LINK"
else
  # Fallback: construct standard Google Drive search query link or print remote path
  echo "⚠️ Notice: rclone link returned empty (folder may need public view). Remote path: ${REMOTE_DIR}/${DEST_FILENAME}" >&2
  echo "${REMOTE_DIR}/${DEST_FILENAME}"
fi
