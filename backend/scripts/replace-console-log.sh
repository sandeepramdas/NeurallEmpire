#!/bin/bash

# Script to replace console.* with structured logger

set -e

echo "🔍 Finding files with console.* usage..."

# Get list of TypeScript files with console usage (excluding node_modules and dist)
FILES=$(grep -rl "console\.\(log\|error\|warn\|info\|debug\)" src/ --include="*.ts" | grep -v ".spec.ts" | grep -v ".test.ts" || true)

if [ -z "$FILES" ]; then
  echo "✅ No console.* usage found!"
  exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "📝 Found $FILE_COUNT files with console.* usage"

# Process each file
for file in $FILES; do
  echo "Processing: $file"

  # Check if file already imports logger
  if ! grep -q "from.*@/infrastructure/logger" "$file" && ! grep -q "from.*'\.\./infrastructure/logger" "$file" && ! grep -q "from.*'\.\.\/\.\.\/infrastructure/logger" "$file"; then
    # Determine correct import path based on file location
    if [[ "$file" == *"/controllers/"* ]] || [[ "$file" == *"/routes/"* ]] || [[ "$file" == *"/services/"* ]] || [[ "$file" == *"/middleware/"* ]]; then
      IMPORT_PATH="@/infrastructure/logger"
    elif [[ "$file" == *"/modules/"* ]]; then
      # Calculate relative path for modules
      IMPORT_PATH="@/infrastructure/logger"
    else
      IMPORT_PATH="@/infrastructure/logger"
    fi

    # Add import at the top (after other imports)
    # Find the last import line
    LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1 || echo "0")

    if [ "$LAST_IMPORT_LINE" -gt 0 ]; then
      # Insert after last import
      sed -i.bak "${LAST_IMPORT_LINE}a\\
import { logger } from '$IMPORT_PATH';
" "$file"
    else
      # No imports found, add at the top
      sed -i.bak "1i\\
import { logger } from '$IMPORT_PATH';\\
" "$file"
    fi
  fi

  # Replace console.* with logger.*
  sed -i.bak2 's/console\.error/logger.error/g' "$file"
  sed -i.bak2 's/console\.warn/logger.warn/g' "$file"
  sed -i.bak2 's/console\.info/logger.info/g' "$file"
  sed -i.bak2 's/console\.debug/logger.debug/g' "$file"
  sed -i.bak2 's/console\.log/logger.info/g' "$file"

  # Remove backup files
  rm -f "${file}.bak" "${file}.bak2"
done

echo "✅ Completed! Replaced console.* with logger.* in $FILE_COUNT files"
echo "🔨 Running TypeScript compiler to check for errors..."
