import React from 'react';
import { Grid, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange, className = '' }) => {
  return (
    <div className={`inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 ${className}`}>
      <button
        onClick={() => onViewModeChange('grid')}
        className={`p-2 rounded-md transition-colors ${
          viewMode === 'grid'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-2 rounded-md transition-colors ${
          viewMode === 'list'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="List view"
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewToggle;
