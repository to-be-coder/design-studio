#!/bin/sh
# Install the Design Studio skills into ~/.claude/skills/
# Safe to re-run: it overwrites the design-studio-* folders and nothing else.
set -e

SRC="$(cd "$(dirname "$0")/skills" && pwd)"
DEST="${HOME}/.claude/skills"

mkdir -p "$DEST"

echo "Installing Design Studio skills into $DEST"
for dir in "$SRC"/design-studio-*; do
  name="$(basename "$dir")"
  rm -rf "$DEST/$name"
  cp -R "$dir" "$DEST/$name"
  echo "  installed $name"
done

echo ""
echo "Done. Restart Claude Code (or start a new session), then run /design-studio-debrief"
