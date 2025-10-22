/**
 * Zerodha Trading Dashboard
 *
 * Main dashboard for 7-layer options trading system
 */

import { useState, useEffect } from 'react';
import { zerodhaService, DashboardMetrics } from '@/services/zerodha.service';
import toast from 'react-hot-toast';

export default function ZerodhaDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await zerodhaService.getDashboard();
      setDashboard(response.data);
    } catch (error: any) {
      toast.error('Failed to load dashboard');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const metrics = dashboard?.metrics;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Zerodha Trading Dashboard</h1>
        <p className="text-gray-600 mt-2">7-Layer Professional Options Trading System</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Open Positions"
          value={metrics?.openPositions || 0}
          icon="📊"
          color="blue"
        />
        <MetricCard
          title="Total P&L"
          value={`₹${metrics?.totalPnL.toFixed(2) || '0.00'}`}
          icon="💰"
          color={metrics && metrics.totalPnL >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics?.winRate.toFixed(1) || '0'}%`}
          icon="🎯"
          color="purple"
        />
        <MetricCard
          title="Total Trades"
          value={metrics?.totalTrades || 0}
          icon="📈"
          color="indigo"
        />
      </div>

      {/* Open Positions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Open Positions</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {dashboard?.openPositions && dashboard.openPositions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strike</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboard.openPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {position.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position.strike} {position.optionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position.positionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{position.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{position.currentPrice?.toFixed(2) || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      (position.unrealizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{position.unrealizedPnL?.toFixed(2) || '0.00'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      (position.unrealizedROI || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {position.unrealizedROI?.toFixed(2) || '0.00'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No open positions
            </div>
          )}
        </div>
      </div>

      {/* Pending Signals */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Signals</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {dashboard?.pendingSignals && dashboard.pendingSignals.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {dashboard.pendingSignals.map((signal) => (
                <div key={signal.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {signal.symbol} {signal.strike} {signal.optionType}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Signal: {signal.signalType} | Score: {signal.signalStrength}/100
                      </p>
                      <div className="mt-2 flex gap-4 text-sm">
                        <span className="text-gray-600">Entry: ₹{signal.entryPrice}</span>
                        <span className="text-green-600">Target: ₹{signal.targetPrice}</span>
                        <span className="text-red-600">SL: ₹{signal.stopLoss}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        signal.writerRatioPassed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        Writer Ratio: {signal.writerRatio?.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No pending signals
            </div>
          )}
        </div>
      </div>

      {/* Recent Trades */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {dashboard?.recentTrades && dashboard.recentTrades.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboard.recentTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.strike} {trade.optionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{trade.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{trade.exitPrice.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      trade.netPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{trade.netPnL.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      trade.roi >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.roi.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        trade.tradeResult === 'WIN'
                          ? 'bg-green-100 text-green-800'
                          : trade.tradeResult === 'LOSS'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {trade.tradeResult}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No recent trades
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon, color }: { title: string; value: any; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
