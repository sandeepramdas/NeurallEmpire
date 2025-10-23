import React, { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, Check, Lightbulb, Zap } from 'lucide-react';
import { api } from '@/services/api';

interface ModelTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  useCase: string;
  recommendedProviders: string[];
  defaultConfig: {
    maxTokens: number;
    temperature: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  capabilities: Record<string, boolean>;
  supportedTasks: string[];
  tags: string[];
  examplePrompt?: string;
}

interface ModelTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ModelTemplate) => void;
}

const ModelTemplates: React.FC<ModelTemplatesProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState<ModelTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<ModelTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/model-templates');
      const data = response.data;

      setTemplates(data.templates || []);
      setCategories(['All', ...(data.categories || [])]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates =
    selectedCategory === 'All'
      ? templates
      : templates.filter(t => t.category === selectedCategory);

  const handleTemplateClick = (template: ModelTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Model Templates
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quick-start configurations for common use cases
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-5rem)]">
            {/* Template List */}
            <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
              {/* Category Filter */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div className="p-4 space-y-3">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No templates found</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ backgroundColor: `${template.color}20` }}
                        >
                          {template.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {template.name}
                            </h3>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: `${template.color}20`,
                                color: template.color,
                              }}
                            >
                              {template.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Template Details */}
            <div className="w-1/2 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
              {selectedTemplate ? (
                <div className="p-6 space-y-6">
                  {/* Template Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                        style={{ backgroundColor: `${selectedTemplate.color}20` }}
                      >
                        {selectedTemplate.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {selectedTemplate.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTemplate.category} Template
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  {/* Use Case */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        Use Case
                      </h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 pl-7">
                      {selectedTemplate.useCase}
                    </p>
                  </div>

                  {/* Default Configuration */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        Optimized Settings
                      </h4>
                    </div>
                    <div className="pl-7 grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Max Tokens
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {selectedTemplate.defaultConfig.maxTokens.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Temperature
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {selectedTemplate.defaultConfig.temperature}
                        </p>
                      </div>
                      {selectedTemplate.defaultConfig.topP !== undefined && (
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Top P</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {selectedTemplate.defaultConfig.topP}
                          </p>
                        </div>
                      )}
                      {selectedTemplate.defaultConfig.frequencyPenalty !== undefined && (
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Frequency Penalty
                          </p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {selectedTemplate.defaultConfig.frequencyPenalty}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommended Providers */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Recommended Providers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.recommendedProviders.map((provider) => (
                        <span
                          key={provider}
                          className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 capitalize"
                        >
                          {provider}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Capabilities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedTemplate.capabilities).map(([key, value]) =>
                        value ? (
                          <span
                            key={key}
                            className="px-3 py-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>

                  {/* Example Prompt */}
                  {selectedTemplate.examplePrompt && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Example Prompt
                      </h4>
                      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          "{selectedTemplate.examplePrompt}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Use Template Button */}
                  <button
                    onClick={handleUseTemplate}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    Use This Template
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center p-6">
                  <div>
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Select a template to view details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelTemplates;
