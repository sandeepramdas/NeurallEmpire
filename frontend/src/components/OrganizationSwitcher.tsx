import React, { useState, useEffect } from 'react';
import { tenantUtils } from '@/services/api';
import { authService } from '@/services/auth';

interface OrganizationSwitcherProps {
  currentOrganization?: {
    id: string;
    name: string;
    slug: string;
  };
  onOrganizationChange?: (slug: string) => void;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  currentOrganization,
  onOrganizationChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Pre-defined organizations for quick access
  const quickOrganizations = [
    { slug: 'test-empire', name: 'Test Empire' },
    { slug: 'demo-org', name: 'Demo Organization' },
    { slug: 'sandbox', name: 'Sandbox' },
  ];

  const handleOrganizationSwitch = (slug: string) => {
    tenantUtils.setTenant(slug);

    // Update URL with tenant parameter for local development
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', slug);
    window.history.pushState({}, '', url.toString());

    // Trigger organization change callback
    if (onOrganizationChange) {
      onOrganizationChange(slug);
    }

    // Reload to apply tenant context
    window.location.reload();
  };

  const handleCustomOrganization = () => {
    if (customSlug.trim()) {
      handleOrganizationSwitch(customSlug.trim());
    }
  };

  const clearOrganization = () => {
    tenantUtils.clearTenant();

    // Remove tenant parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('tenant');
    window.history.pushState({}, '', url.toString());

    // Reload to clear tenant context
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {currentOrganization?.name?.charAt(0) || 'N'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {currentOrganization?.name || 'Select Organization'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* Current Organization */}
            {currentOrganization && (
              <>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Current Organization
                </div>
                <div className="px-4 py-2 flex items-center space-x-3 bg-indigo-50">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {currentOrganization.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {currentOrganization.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currentOrganization.slug}
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-1"></div>
              </>
            )}

            {/* Quick Organizations */}
            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Quick Access
            </div>
            {quickOrganizations.map((org) => (
              <button
                key={org.slug}
                onClick={() => handleOrganizationSwitch(org.slug)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
              >
                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {org.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-900">{org.name}</div>
                  <div className="text-xs text-gray-500">{org.slug}</div>
                </div>
              </button>
            ))}

            <div className="border-t border-gray-200 my-1"></div>

            {/* Custom Organization */}
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                + Connect to Custom Organization
              </button>
            ) : (
              <div className="px-4 py-2">
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Organization Slug
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="test-empire"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCustomOrganization();
                      }
                    }}
                  />
                  <button
                    onClick={handleCustomOrganization}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Go
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomSlug('');
                  }}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Clear Organization */}
            {currentOrganization && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={clearOrganization}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Clear Organization
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default OrganizationSwitcher;