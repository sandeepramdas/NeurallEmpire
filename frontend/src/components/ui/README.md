# UI Components Documentation

Reusable UI components to reduce code duplication and maintain consistency.

## Components

### `<StatusBadge>`

Display status with consistent styling and dark mode support.

```typescript
import { StatusBadge } from '@/components/ui';

<StatusBadge
  status="active"
  size="md"
  className="custom-class"
/>
```

**Props:**
- `status` (string, required) - Status value (active, draft, completed, etc.)
- `size` ('sm' | 'md' | 'lg') - Badge size (default: 'md')
- `className` (string) - Additional CSS classes

### `<StatsCard>`

Display metrics with icons, values, and optional change indicators.

```typescript
import { StatsCard } from '@/components/ui';
import { Bot } from 'lucide-react';

<StatsCard
  title="Total Agents"
  value={stats.totalAgents}
  icon={Bot}
  iconColor="text-primary-600 dark:text-primary-400"
  iconBgColor="bg-primary-100 dark:bg-primary-900/30"
  change={{ value: 12.5, label: 'vs last month' }}
  subtitle="Active across organization"
/>
```

**Props:**
- `title` (string, required) - Card title
- `value` (string | number, required) - Main value to display
- `icon` (LucideIcon, required) - Icon component from lucide-react
- `iconColor` (string) - Icon color classes
- `iconBgColor` (string) - Icon background color classes
- `change` (object) - Optional change indicator with value and label
- `subtitle` (string) - Optional subtitle text
- `className` (string) - Additional CSS classes

### `<SearchFilterBar>`

Unified search and filter controls.

```typescript
import { SearchFilterBar } from '@/components/ui';

<SearchFilterBar
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder="Search agents..."
  filters={[
    {
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' }
      ],
      label: 'Status Filter'
    }
  ]}
  rightActions={
    <button className="btn-primary">
      <Plus className="w-4 h-4 mr-2" />
      Add New
    </button>
  }
/>
```

**Props:**
- `searchValue` (string, required) - Current search value
- `onSearchChange` (function, required) - Search change handler
- `searchPlaceholder` (string) - Search input placeholder
- `filters` (array) - Array of filter configurations
- `rightActions` (ReactNode) - Optional right-side action buttons
- `className` (string) - Additional CSS classes

### `<ViewToggle>`

Toggle between grid and list views.

```typescript
import { ViewToggle } from '@/components/ui';

<ViewToggle
  viewMode={viewMode}
  onViewModeChange={setViewMode}
/>
```

**Props:**
- `viewMode` ('grid' | 'list', required) - Current view mode
- `onViewModeChange` (function, required) - View mode change handler
- `className` (string) - Additional CSS classes

### `<EmptyState>`

Display empty state with icon, message, and optional action.

```typescript
import { EmptyState } from '@/components/ui';
import { Inbox } from 'lucide-react';

<EmptyState
  icon={Inbox}
  title="No messages"
  description="You don't have any messages yet. Start a conversation!"
  action={{
    label: 'Compose Message',
    onClick: () => setIsComposeOpen(true)
  }}
/>
```

**Props:**
- `icon` (LucideIcon, required) - Icon component
- `title` (string, required) - Main heading
- `description` (string) - Optional description text
- `action` (object) - Optional action button with label and onClick
- `className` (string) - Additional CSS classes

## Usage Examples

### Before (Duplicated Code):
```typescript
// Every file had this repeated:
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
  <input
    type="text"
    placeholder="Search..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full pl-10 pr-4 py-2 border rounded-lg..."
  />
</div>

<select value={filter} onChange={(e) => setFilter(e.target.value)}>
  {/* filter options */}
</select>

<button onClick={handleAdd}>
  <Plus /> Add New
</button>
```

### After (Reusable Component):
```typescript
<SearchFilterBar
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  filters={[{ value: filter, onChange: setFilter, options: filterOptions }]}
  rightActions={<button onClick={handleAdd}>Add New</button>}
/>
```

## Benefits

1. **Consistency** - Same UI patterns across all pages
2. **Maintenance** - Update once, reflected everywhere
3. **Accessibility** - Built-in ARIA labels and keyboard support
4. **Dark Mode** - Full dark mode support out of the box
5. **Type Safety** - TypeScript types and autocomplete
6. **Less Code** - Significant reduction in component file sizes

## Files Using Components

- ✅ Messages.tsx (using formatters)
- ✅ Dashboard.tsx (using StatsCard, formatters)
- 📝 Agents.tsx (can use StatusBadge, SearchFilterBar, ViewToggle)
- 📝 Campaigns.tsx (can use StatusBadge, StatsCard, SearchFilterBar)
- 📝 Templates.tsx (can use SearchFilterBar, ViewToggle)
