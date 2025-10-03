import React, { useState } from 'react';
import { Globe, Plus, Check, AlertCircle, Shield, Copy, Trash2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface CustomDomain {
  id: string;
  domain: string;
  status: 'verified' | 'pending' | 'failed';
  sslStatus: 'active' | 'pending' | 'inactive';
  addedAt: string;
  verifiedAt?: string;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: string;
}

const DomainSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [newDomain, setNewDomain] = useState('');
  const [showDNSInstructions, setShowDNSInstructions] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mock data
  const defaultDomain = `${user?.organization?.name.toLowerCase().replace(/\s+/g, '-') || 'mycompany'}.neurallempire.com`;

  const [customDomains, setCustomDomains] = useState<CustomDomain[]>([
    {
      id: '1',
      domain: 'app.mycompany.com',
      status: 'verified',
      sslStatus: 'active',
      addedAt: '2024-01-15T10:00:00Z',
      verifiedAt: '2024-01-15T14:30:00Z',
    },
    {
      id: '2',
      domain: 'portal.example.com',
      status: 'pending',
      sslStatus: 'pending',
      addedAt: '2024-03-20T09:15:00Z',
    },
    {
      id: '3',
      domain: 'dashboard.oldsite.com',
      status: 'failed',
      sslStatus: 'inactive',
      addedAt: '2024-02-10T11:20:00Z',
    },
  ]);

  const dnsRecords: DNSRecord[] = [
    {
      type: 'A',
      name: '@',
      value: '192.0.2.1',
      ttl: '3600',
    },
    {
      type: 'CNAME',
      name: 'www',
      value: 'neurallempire.com',
      ttl: '3600',
    },
    {
      type: 'TXT',
      name: '_neurallempire',
      value: 'neurallempire-verification=abc123def456',
      ttl: '3600',
    },
  ];

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;

    const domain: CustomDomain = {
      id: Date.now().toString(),
      domain: newDomain.trim(),
      status: 'pending',
      sslStatus: 'pending',
      addedAt: new Date().toISOString(),
    };

    setCustomDomains([...customDomains, domain]);
    setNewDomain('');
    setShowDNSInstructions(true);
  };

  const handleVerifyDomain = (domainId: string) => {
    setCustomDomains(
      customDomains.map((d) =>
        d.id === domainId
          ? { ...d, status: 'verified', sslStatus: 'active', verifiedAt: new Date().toISOString() }
          : d
      )
    );
  };

  const handleRemoveDomain = (domainId: string) => {
    if (window.confirm('Are you sure you want to remove this domain?')) {
      setCustomDomains(customDomains.filter((d) => d.id !== domainId));
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: CustomDomain['status']) => {
    const statusConfig = {
      verified: {
        bg: 'bg-green-100 text-green-800',
        icon: Check,
        text: 'Verified',
      },
      pending: {
        bg: 'bg-yellow-100 text-yellow-800',
        icon: AlertCircle,
        text: 'Pending',
      },
      failed: {
        bg: 'bg-red-100 text-red-800',
        icon: AlertCircle,
        text: 'Failed',
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const getSSLBadge = (sslStatus: CustomDomain['sslStatus']) => {
    const sslConfig = {
      active: {
        bg: 'bg-green-100 text-green-800',
        text: 'SSL Active',
      },
      pending: {
        bg: 'bg-yellow-100 text-yellow-800',
        text: 'SSL Pending',
      },
      inactive: {
        bg: 'bg-gray-100 text-gray-800',
        text: 'SSL Inactive',
      },
    };

    const config = sslConfig[sslStatus];

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg}`}>
        <Shield className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Domain Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your custom domains and DNS configuration
        </p>
      </div>

      {/* Default Domain */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Default Domain</h2>
            <p className="mt-1 text-sm text-gray-600">
              Your NeurallEmpire subdomain that's always available
            </p>
            <div className="mt-4 flex items-center gap-3">
              <code className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono text-gray-900">
                {defaultDomain}
              </code>
              <button
                onClick={() => handleCopy(defaultDomain, 'default')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                {copiedField === 'default' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Domain */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Plus className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Add Custom Domain</h2>
            <p className="mt-1 text-sm text-gray-600">
              Connect your own domain to your NeurallEmpire workspace
            </p>
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="app.yourdomain.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddDomain}
                disabled={!newDomain.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Add Domain
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DNS Configuration Instructions */}
      {showDNSInstructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">DNS Configuration Required</h3>
              <p className="mt-1 text-sm text-blue-800">
                Add the following DNS records to your domain provider to verify ownership and enable SSL:
              </p>
              <div className="mt-4 space-y-3">
                {dnsRecords.map((record, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block mb-1">Type</span>
                        <span className="font-mono font-semibold text-gray-900">{record.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Name</span>
                        <span className="font-mono text-gray-900">{record.name}</span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-gray-500 block mb-1">Value</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-900 truncate">{record.value}</span>
                          <button
                            onClick={() => handleCopy(record.value, `dns-${index}`)}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          >
                            {copiedField === `dns-${index}` ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">TTL</span>
                        <span className="font-mono text-gray-900">{record.ttl}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  DNS changes may take up to 48 hours to propagate. Click "Verify" on your domain once the records are added.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDNSInstructions(false)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Close Instructions
          </button>
        </div>
      )}

      {/* Custom Domains List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Domains</h2>

        {customDomains.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No custom domains added yet</p>
            <p className="text-gray-400 text-xs mt-1">Add your first custom domain to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {customDomains.map((domain) => (
              <div
                key={domain.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-gray-900">{domain.domain}</h3>
                      {getStatusBadge(domain.status)}
                      {getSSLBadge(domain.sslStatus)}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span>Added {new Date(domain.addedAt).toLocaleDateString()}</span>
                      {domain.verifiedAt && (
                        <span>Verified {new Date(domain.verifiedAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {domain.status === 'failed' && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Verification failed</p>
                          <p className="text-xs text-red-500 mt-1">
                            Please check your DNS records and try again. Make sure all records are properly configured.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {domain.status === 'pending' && (
                      <button
                        onClick={() => handleVerifyDomain(domain.id)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Verify
                      </button>
                    )}
                    {domain.status === 'verified' && (
                      <a
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleRemoveDomain(domain.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Verification Steps</h2>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Add your custom domain</p>
              <p className="text-xs text-gray-600 mt-1">Enter your domain name in the form above</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Configure DNS records</p>
              <p className="text-xs text-gray-600 mt-1">Add the provided DNS records to your domain provider</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Wait for DNS propagation</p>
              <p className="text-xs text-gray-600 mt-1">DNS changes can take up to 48 hours to propagate</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
              4
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Verify domain</p>
              <p className="text-xs text-gray-600 mt-1">Click the "Verify" button to check your DNS configuration</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
              5
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">SSL certificate issued</p>
              <p className="text-xs text-gray-600 mt-1">We'll automatically issue an SSL certificate for your domain</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default DomainSettings;
