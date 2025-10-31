import React, { useEffect, useState } from 'react';
import { activityLogger } from '@/utils/activityLogger';

interface ActivityLog {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  details: Record<string, any>;
  url: string;
  sessionId: string;
}

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    // Get logs from activity logger
    const allLogs = activityLogger.getAllLogs();
    setLogs(allLogs);

    // Refresh every 2 seconds
    const interval = setInterval(() => {
      const updated = activityLogger.getAllLogs();
      setLogs(updated);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (typeFilter !== 'ALL' && log.type !== typeFilter) return false;
    if (filter && !JSON.stringify(log).toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${Date.now()}.json`;
    link.click();
  };

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      activityLogger.clearLogs();
      setLogs([]);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ERROR: 'bg-red-100 text-red-800',
      OAUTH_START: 'bg-blue-100 text-blue-800',
      OAUTH_CALLBACK: 'bg-purple-100 text-purple-800',
      API_REQUEST: 'bg-yellow-100 text-yellow-800',
      API_RESPONSE: 'bg-green-100 text-green-800',
      NAVIGATION: 'bg-gray-100 text-gray-800',
      PAGE_VIEW: 'bg-indigo-100 text-indigo-800',
      CLICK: 'bg-pink-100 text-pink-800',
      AUTH_STATE_CHANGE: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const types = ['ALL', ...new Set(logs.map((l) => l.type))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Logs</h1>
          <p className="text-gray-600">Real-time frontend activity tracking and debugging</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <input
              type="text"
              placeholder="Search logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Actions */}
            <button
              onClick={exportLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear
            </button>

            {/* Stats */}
            <div className="ml-auto text-sm text-gray-600">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No logs found. Activity will appear here automatically.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(log.type)}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <details className="cursor-pointer">
                          <summary className="hover:text-gray-700">View details</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-w-md">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.url}>
                        {log.url}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Console */}
        <div className="mt-6 bg-black rounded-lg shadow p-4 text-green-400 font-mono text-sm max-h-96 overflow-y-auto">
          <div className="mb-2 text-gray-400">// Live Activity Console</div>
          {filteredLogs.slice(-20).reverse().map((log) => (
            <div key={log.id} className="mb-1">
              [{new Date(log.timestamp).toLocaleTimeString()}]
              <span className="text-yellow-400"> {log.type}</span>: {log.action}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
