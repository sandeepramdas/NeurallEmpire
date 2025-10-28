# Utilities Documentation

Centralized utility functions to reduce code duplication and improve maintainability.

## Files

### `statusColors.ts`

Centralized status color mappings for consistent badge styling across the application.

```typescript
import { getStatusColor, getStatusDisplay } from '@/utils/statusColors';

// Usage
const statusClass = getStatusColor('active'); // Returns full Tailwind classes
const displayText = getStatusDisplay('ACTIVE'); // Returns "Active"
```

**Supported Status Types:**
- `active`, `ACTIVE`, `running`, `RUNNING`, `completed`, `delivered`
- `paused`, `PAUSED`, `pending`, `generated`
- `draft`, `DRAFT`, `deprecated`, `DEPRECATED`, `archived`, `ARCHIVED`
- `deployed`, `approved`, `reviewed`, `scheduled`, `sent`, `responded`
- `ready`, `READY`, `testing`, `TESTING`
- `error`, `ERROR`, `failed`
- `maintenance`, `MAINTENANCE`

### `priorityColors.ts`

Centralized priority color mappings for badges and indicators.

```typescript
import { getPriorityColor, getPriorityBorderColor, getPriorityTextColor } from '@/utils/priorityColors';

// Usage
const priorityClass = getPriorityColor('urgent'); // Full badge classes
const borderClass = getPriorityBorderColor('high'); // Border color only
const textClass = getPriorityTextColor('low'); // Text color only
```

**Priority Types:**
- `urgent` - Red theme
- `high` - Orange theme
- `normal` - Gray theme
- `low` - Blue theme

### `formatters.ts`

Common formatting utilities for dates, currency, numbers, etc.

```typescript
import {
  formatCurrency,
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatTimeAgo,
  formatDuration,
  formatPercentage,
  formatFileSize,
  truncateText,
  formatPhoneNumber,
  capitalizeWords,
  camelToTitle
} from '@/utils/formatters';

// Examples
formatCurrency(1234.56); // "$1,234.56"
formatCompactNumber(1500000); // "1.5M"
formatTimeAgo(new Date('2024-01-01')); // "2 days ago"
formatDuration(125000); // "2m 5s"
formatPercentage(45.6789, 2); // "45.68%"
formatFileSize(1536000); // "1.46 MB"
truncateText("Long text...", 10); // "Long text..."
formatPhoneNumber("1234567890"); // "(123) 456-7890"
```

## Migration Guide

### Before:
```typescript
// Duplicate statusColors in every file
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  // ... repeated 50+ times across files
};

// Duplicate formatters
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Duplicate timeAgo logic
const formatTimeAgo = (timestamp: string) => {
  // 20+ lines of duplicate code
};
```

### After:
```typescript
import { getStatusColor } from '@/utils/statusColors';
import { formatCurrency, formatTimeAgo } from '@/utils/formatters';

// Use directly - no duplication!
<span className={getStatusColor(status)}>
  {status}
</span>
```

## Benefits

1. **Single Source of Truth** - Update colors/logic in one place
2. **Consistency** - Same formatting across entire app
3. **Dark Mode Support** - All utilities include dark mode classes
4. **Type Safety** - TypeScript types for better IDE support
5. **Reduced Bundle Size** - No duplicate code
6. **Easier Testing** - Test utilities once, works everywhere

## Files Refactored

- ✅ Messages.tsx
- ✅ Dashboard.tsx
- 🔄 Agents.tsx (in progress)
- 🔄 Campaigns.tsx (in progress)
- 🔄 Workflows.tsx (in progress)
- 📝 Other files (pending)
