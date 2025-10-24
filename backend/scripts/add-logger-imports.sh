#!/bin/bash

# Bulk add logger imports to files that use logger.* but don't have the import

set -e

echo "🔍 Finding files that use logger.* but missing import..."

# Find files using logger.* without the import
FILES=$(bash -c 'grep -rl "logger\.\(error\|warn\|info\|debug\)" src --include="*.ts" | while read file; do if ! grep -q "@/infrastructure/logger\|infrastructure/logger" "$file"; then echo "$file"; fi; done')

if [ -z "$FILES" ]; then
  echo "✅ All files have logger import!"
  exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "📝 Found $FILE_COUNT files missing logger import"

# Process each file
for file in $FILES; do
  echo "Adding import to: $file"

  # Find the last import line
  LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1 || echo "0")

  if [ "$LAST_IMPORT_LINE" -gt 0 ]; then
    # Insert after last import
    sed -i.bak "${LAST_IMPORT_LINE}a\\
import { logger } from '@/infrastructure/logger';
" "$file"
  else
    # No imports found, add at the top (after any file header comments)
    sed -i.bak "1i\\
import { logger } from '@/infrastructure/logger';\\
" "$file"
  fi

  # Remove backup file
  rm -f "${file}.bak"
done

echo "✅ Added logger import to $FILE_COUNT files"
