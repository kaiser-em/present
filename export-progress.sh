#!/bin/sh
# export-progress.sh — Copy HABBIT progress.json to Present app workspace for import
SETTINGS_DIR="/var/minis/skills/habbit"
PROGRESS_FILE="$SETTINGS_DIR/progress.json"
OUTPUT_FILE="/var/minis/workspace/present/progress-data.json"

if [ ! -f "$PROGRESS_FILE" ]; then
  echo "Error: $PROGRESS_FILE not found"
  exit 1
fi

cp "$PROGRESS_FILE" "$OUTPUT_FILE"
echo "Exported $PROGRESS_FILE to $OUTPUT_FILE"
