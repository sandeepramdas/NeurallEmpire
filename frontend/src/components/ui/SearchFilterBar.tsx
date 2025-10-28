import React from 'react';
import { Search, Filter } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    label?: string;
  }[];
  rightActions?: React.ReactNode;
  className?: string;
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  rightActions,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        {filters.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            {filters.map((filter, index) => (
              <select
                key={index}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                aria-label={filter.label || `Filter ${index + 1}`}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}

        {/* Right Actions */}
        {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
      </div>
    </div>
  );
};

export default SearchFilterBar;
