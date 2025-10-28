/**
 * Centralized Status Color Mappings
 * Used across dashboard components for consistent status badge styling
 */

export type StatusType =
  | 'active' | 'ACTIVE'
  | 'paused' | 'PAUSED'
  | 'draft' | 'DRAFT'
  | 'ready' | 'READY'
  | 'testing' | 'TESTING'
  | 'error' | 'ERROR'
  | 'running' | 'RUNNING'
  | 'maintenance' | 'MAINTENANCE'
  | 'deprecated' | 'DEPRECATED'
  | 'archived' | 'ARCHIVED'
  | 'scheduled' | 'completed' | 'failed'
  | 'deployed' | 'approved' | 'reviewed' | 'generated'
  | 'pending' | 'sent' | 'delivered' | 'responded';

export const statusColors: Record<string, string> = {
  // Active states
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  running: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  RUNNING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

  // Paused/Pending states
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  pending: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  generated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',

  // Draft/Inactive states
  draft: 'bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:text-gray-200',
  DRAFT: 'bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:text-gray-200',
  deprecated: 'bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:text-gray-200',
  DEPRECATED: 'bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:text-gray-200',
  archived: 'bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:text-gray-200',
  ARCHIVED: 'bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:text-gray-200',

  // Success states
  deployed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  reviewed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  responded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',

  // Ready/Testing states
  ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  READY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  testing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  TESTING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',

  // Error/Failed states
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',

  // Maintenance states
  maintenance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  MAINTENANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export const getStatusColor = (status: string): string => {
  return statusColors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
};

export const getStatusDisplay = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};
