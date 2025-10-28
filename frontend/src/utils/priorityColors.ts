/**
 * Centralized Priority Color Mappings
 * Used for priority badges, labels, and indicators
 */

export type PriorityType = 'urgent' | 'high' | 'normal' | 'low';

export const priorityColors: Record<PriorityType, string> = {
  urgent: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200',
  high: 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200',
  normal: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
  low: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200',
};

export const getPriorityColor = (priority: string): string => {
  return priorityColors[priority as PriorityType] || priorityColors.normal;
};

export const getPriorityBorderColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'border-red-500';
    case 'high':
      return 'border-orange-500';
    case 'low':
      return 'border-blue-500';
    default:
      return 'border-gray-300 dark:border-gray-600';
  }
};

export const getPriorityTextColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 dark:text-red-400';
    case 'high':
      return 'text-orange-600 dark:text-orange-400';
    case 'low':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};
