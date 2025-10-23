import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Settings, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface AIModelConfig {
  id: string;
  modelId: string;
  displayName: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  provider: {
    code: string;
    name: string;
    displayName: string;
    icon?: string;
    color?: string;
  };
}

interface ModelSelectorProps {
  value?: string; // Selected model config ID
  onChange: (modelConfigId: string, modelConfig: AIModelConfig) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

/**
 * ModelSelector Component
 * Dropdown to select a configured AI model
 * Groups models by provider and shows configuration link if no models exist
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  label = 'AI Model',
  placeholder = 'Select an AI model',
  required = false,
  error,
  className = '',
}) => {
  const [models, setModels] = useState<AIModelConfig[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuthStore();

  const selectedModel = models.find((m) => m.id === value);

  // Fetch configured models
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/ai-models/configs', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI models');
      }

      const data = await response.json();
      setModels(data.configs || []);

      // Auto-select default model if no value is set
      if (!value && data.configs.length > 0) {
        const defaultModel = data.configs.find((m: AIModelConfig) => m.isDefault);
        if (defaultModel) {
          onChange(defaultModel.id, defaultModel);
        }
      }
    } catch (err: any) {
      console.error('Error fetching models:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const providerCode = model.provider.code;
    if (!acc[providerCode]) {
      acc[providerCode] = {
        provider: model.provider,
        models: [],
      };
    }
    acc[providerCode].models.push(model);
    return acc;
  }, {} as Record<string, { provider: AIModelConfig['provider']; models: AIModelConfig[] }>);

  const handleSelect = (model: AIModelConfig) => {
    onChange(model.id, model);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400">
          Loading models...
        </div>
      </div>
    );
  }

  // Show configuration link if no models exist
  if (models.length === 0) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-4 py-3 border border-yellow-300 rounded-md bg-yellow-50">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium">
                No AI models configured
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Configure AI models to use this feature.
              </p>
              <Link
                to={`/org/${organization?.slug}/settings/ai-models`}
                className="inline-flex items-center space-x-1 text-xs text-yellow-800 hover:text-yellow-900 font-medium mt-2"
              >
                <Settings className="w-3 h-3" />
                <span>Configure AI Models</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected value display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 text-left bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {selectedModel ? (
              <>
                {selectedModel.provider.icon && (
                  <img
                    src={selectedModel.provider.icon}
                    alt={selectedModel.provider.name}
                    className="w-5 h-5 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate block">
                    {selectedModel.displayName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedModel.provider.displayName}
                  </span>
                </div>
                {selectedModel.isDefault && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    Default
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
            {Object.entries(groupedModels).map(([providerCode, { provider, models: providerModels }]) => (
              <div key={providerCode} className="py-1">
                {/* Provider header */}
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    {provider.icon && (
                      <img
                        src={provider.icon}
                        alt={provider.name}
                        className="w-4 h-4 rounded"
                      />
                    )}
                    <span className="text-xs font-medium text-gray-600">
                      {provider.displayName}
                    </span>
                  </div>
                </div>

                {/* Provider models */}
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model)}
                    disabled={!model.isActive}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                      !model.isActive ? 'opacity-50 cursor-not-allowed' : ''
                    } ${value === model.id ? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900 font-medium">
                          {model.displayName}
                        </span>
                        {model.isDefault && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {model.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {model.description}
                        </p>
                      )}
                    </div>
                    {value === model.id && (
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))}

            {/* Configure link */}
            <div className="border-t border-gray-200 py-2 px-3 bg-gray-50">
              <Link
                to={`/org/${organization?.slug}/settings/ai-models`}
                className="flex items-center space-x-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-3 h-3" />
                <span>Manage AI Models</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;
