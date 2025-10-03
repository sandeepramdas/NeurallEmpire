import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Shield, Lock, Smartphone, Globe, AlertTriangle, Check, X, Clock, MapPin, Monitor } from 'lucide-react';

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LoginHistory {
  id: string;
  timestamp: string;
  location: string;
  ipAddress: string;
  device: string;
  status: 'success' | 'failed';
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
}

const SecurityCompliance: React.FC = () => {
  const { user } = useAuthStore();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [dataRetentionDays, setDataRetentionDays] = useState(90);

  // Mock data for active sessions
  const [activeSessions] = useState<Session[]>([
    {
      id: '1',
      device: 'MacBook Pro',
      browser: 'Chrome 120.0',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.100',
      lastActive: '2 minutes ago',
      isCurrent: true,
    },
    {
      id: '2',
      device: 'iPhone 15 Pro',
      browser: 'Safari Mobile',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.101',
      lastActive: '1 hour ago',
      isCurrent: false,
    },
    {
      id: '3',
      device: 'Windows Desktop',
      browser: 'Edge 120.0',
      location: 'New York, NY',
      ipAddress: '203.0.113.42',
      lastActive: '3 days ago',
      isCurrent: false,
    },
  ]);

  // Mock data for login history
  const [loginHistory] = useState<LoginHistory[]>([
    {
      id: '1',
      timestamp: '2025-10-04 10:30 AM',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.100',
      device: 'MacBook Pro - Chrome',
      status: 'success',
    },
    {
      id: '2',
      timestamp: '2025-10-03 09:15 AM',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.100',
      device: 'MacBook Pro - Chrome',
      status: 'success',
    },
    {
      id: '3',
      timestamp: '2025-10-03 02:45 AM',
      location: 'Unknown',
      ipAddress: '198.51.100.42',
      device: 'Unknown Device',
      status: 'failed',
    },
    {
      id: '4',
      timestamp: '2025-10-02 04:20 PM',
      location: 'New York, NY',
      ipAddress: '203.0.113.42',
      device: 'Windows Desktop - Edge',
      status: 'success',
    },
  ]);

  // Mock data for audit log
  const [auditLog] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2025-10-04 10:30 AM',
      action: 'User logged in',
      user: user?.email || 'user@example.com',
      ipAddress: '192.168.1.100',
      status: 'success',
    },
    {
      id: '2',
      timestamp: '2025-10-04 09:15 AM',
      action: 'API key created',
      user: user?.email || 'user@example.com',
      ipAddress: '192.168.1.100',
      status: 'success',
    },
    {
      id: '3',
      timestamp: '2025-10-03 11:22 PM',
      action: 'Failed login attempt',
      user: 'unknown@example.com',
      ipAddress: '198.51.100.42',
      status: 'error',
    },
    {
      id: '4',
      timestamp: '2025-10-03 03:45 PM',
      action: 'Password changed',
      user: user?.email || 'user@example.com',
      ipAddress: '192.168.1.100',
      status: 'warning',
    },
  ]);

  const handleRevokeSession = (sessionId: string) => {
    console.log('Revoking session:', sessionId);
  };

  const handleEnable2FA = () => {
    setShowQRCode(true);
  };

  const handleConfirm2FA = () => {
    setTwoFactorEnabled(true);
    setShowQRCode(false);
  };

  const handleDisable2FA = () => {
    if (window.confirm('Are you sure you want to disable two-factor authentication?')) {
      setTwoFactorEnabled(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Security & Compliance</h1>
        <p className="text-gray-600 mt-2">Manage security settings and monitor account activity</p>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Two-Factor Authentication</p>
              <p className="text-2xl font-bold text-gray-900 mt-2 flex items-center">
                {twoFactorEnabled ? (
                  <>
                    <Check className="w-6 h-6 text-green-500 mr-2" />
                    <span className="text-green-600">Enabled</span>
                  </>
                ) : (
                  <>
                    <X className="w-6 h-6 text-red-500 mr-2" />
                    <span className="text-red-600">Disabled</span>
                  </>
                )}
              </p>
            </div>
            <Smartphone className="w-12 h-12 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Password Change</p>
              <p className="text-2xl font-bold text-gray-900 mt-2 flex items-center">
                <Clock className="w-6 h-6 text-gray-400 mr-2" />
                30 days ago
              </p>
            </div>
            <Lock className="w-12 h-12 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900 mt-2 flex items-center">
                <Monitor className="w-6 h-6 text-gray-400 mr-2" />
                {activeSessions.length}
              </p>
            </div>
            <Globe className="w-12 h-12 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Smartphone className="w-5 h-5 mr-2" />
          Two-Factor Authentication (2FA)
        </h3>
        <p className="text-gray-600 mb-4">
          Add an extra layer of security to your account by requiring a verification code in addition to your password.
        </p>

        {!twoFactorEnabled && !showQRCode && (
          <button
            onClick={handleEnable2FA}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Enable Two-Factor Authentication
          </button>
        )}

        {showQRCode && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="bg-gray-100 p-8 rounded-lg inline-block mb-4">
              <div className="w-48 h-48 bg-white flex items-center justify-center">
                <span className="text-gray-400">QR Code Placeholder</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter verification code
              </label>
              <input
                type="text"
                placeholder="000000"
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleConfirm2FA}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Confirm & Enable
              </button>
              <button
                onClick={() => setShowQRCode(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {twoFactorEnabled && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Two-factor authentication is enabled</span>
              </div>
            </div>
            <button
              onClick={handleDisable2FA}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Disable Two-Factor Authentication
            </button>
          </div>
        )}
      </div>

      {/* Password Policy Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lock className="w-5 h-5 mr-2" />
          Password Policy
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Minimum password length</p>
              <p className="text-sm text-gray-600">Required: 12 characters</p>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Require special characters</p>
              <p className="text-sm text-gray-600">At least one special character required</p>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Password expiration</p>
              <p className="text-sm text-gray-600">Passwords expire after 90 days</p>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Password history</p>
              <p className="text-sm text-gray-600">Cannot reuse last 5 passwords</p>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Active Sessions
        </h3>
        <div className="space-y-4">
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start space-x-4">
                <Monitor className="w-8 h-8 text-gray-400 mt-1" />
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-gray-900">{session.device}</p>
                    {session.isCurrent && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Current Session
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{session.browser}</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {session.location}
                    </span>
                    <span className="flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      {session.ipAddress}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {session.lastActive}
                    </span>
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Login History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Location</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Device</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900">{entry.timestamp}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{entry.location}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-mono">{entry.ipAddress}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{entry.device}</td>
                  <td className="py-3 px-4">
                    {entry.status === 'success' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="w-3 h-3 mr-1" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Security Audit Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Action</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">User</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900">{entry.timestamp}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{entry.action}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{entry.user}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-mono">{entry.ipAddress}</td>
                  <td className="py-3 px-4">
                    {entry.status === 'success' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="w-3 h-3 mr-1" />
                        Success
                      </span>
                    )}
                    {entry.status === 'warning' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Warning
                      </span>
                    )}
                    {entry.status === 'error' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Retention Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Data Retention Settings
        </h3>
        <p className="text-gray-600 mb-4">
          Configure how long to retain audit logs and session data for compliance purposes.
        </p>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retention Period (days)
            </label>
            <select
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(Number(e.target.value))}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days (Recommended)</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days</option>
            </select>
          </div>
          <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mt-6">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityCompliance;
