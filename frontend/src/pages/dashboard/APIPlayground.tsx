import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Play,
  Copy,
  Check,
  Code,
  Key,
  Clock,
  Save,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Book,
  FileCode,
} from 'lucide-react';

interface RequestHeader {
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
}

interface APIResponse {
  status: number;
  statusText: string;
  headers: { [key: string]: string };
  body: any;
  responseTime: number;
}

const APIPlayground: React.FC = () => {
  const { } = useAuthStore();
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [customPath, setCustomPath] = useState('/api/v1/agents');
  const [requestBody, setRequestBody] = useState('{\n  "name": "New Agent",\n  "type": "chatbot"\n}');
  const [headers, setHeaders] = useState<RequestHeader[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Accept', value: 'application/json', enabled: true },
  ]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { key: 'limit', value: '10', enabled: true },
    { key: 'offset', value: '0', enabled: false },
  ]);
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [savedCollections] = useState<string[]>(['User Management', 'Agent Operations']);

  const endpoints: APIEndpoint[] = [
    { id: '1', method: 'GET', path: '/api/v1/agents', description: 'Get all agents' },
    { id: '2', method: 'POST', path: '/api/v1/agents', description: 'Create a new agent' },
    { id: '3', method: 'GET', path: '/api/v1/agents/{id}', description: 'Get agent by ID' },
    { id: '4', method: 'PUT', path: '/api/v1/agents/{id}', description: 'Update agent' },
    { id: '5', method: 'DELETE', path: '/api/v1/agents/{id}', description: 'Delete agent' },
    { id: '6', method: 'GET', path: '/api/v1/campaigns', description: 'Get all campaigns' },
    { id: '7', method: 'POST', path: '/api/v1/campaigns', description: 'Create a new campaign' },
    { id: '8', method: 'GET', path: '/api/v1/campaigns/{id}', description: 'Get campaign by ID' },
    { id: '9', method: 'POST', path: '/api/v1/campaigns/{id}/send', description: 'Send campaign' },
    { id: '10', method: 'GET', path: '/api/v1/analytics', description: 'Get analytics data' },
    { id: '11', method: 'GET', path: '/api/v1/users', description: 'Get all users' },
    { id: '12', method: 'POST', path: '/api/v1/webhooks', description: 'Create webhook' },
  ];

  const mockApiKey = 'ne_live_1234567890abcdefghijklmnopqrstuvwxyz';

  const handleSendRequest = async () => {
    setIsLoading(true);

    // Simulate API request
    setTimeout(() => {
      const mockResponse: APIResponse = {
        status: method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200,
        statusText: method === 'POST' ? 'Created' : method === 'DELETE' ? 'No Content' : 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '999',
          'X-Response-Time': '45ms',
        },
        body:
          method === 'DELETE'
            ? null
            : {
                success: true,
                data:
                  method === 'GET'
                    ? [
                        {
                          id: '1',
                          name: 'Customer Support Bot',
                          type: 'chatbot',
                          status: 'active',
                          createdAt: '2025-09-15T10:30:00Z',
                        },
                        {
                          id: '2',
                          name: 'Sales Assistant',
                          type: 'assistant',
                          status: 'active',
                          createdAt: '2025-09-20T14:45:00Z',
                        },
                      ]
                    : {
                        id: '3',
                        name: 'New Agent',
                        type: 'chatbot',
                        status: 'active',
                        createdAt: new Date().toISOString(),
                      },
                message: method === 'POST' ? 'Agent created successfully' : undefined,
              },
        responseTime: Math.floor(Math.random() * 100) + 20,
      };

      setResponse(mockResponse);
      setIsLoading(false);
    }, 800);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newHeaders: RequestHeader[] = [...headers];
    if (field === 'enabled') {
      newHeaders[index][field] = value as boolean;
    } else {
      newHeaders[index][field] = value as string;
    }
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  };

  const updateQueryParam = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newParams: QueryParam[] = [...queryParams];
    if (field === 'enabled') {
      newParams[index][field] = value as boolean;
    } else {
      newParams[index][field] = value as string;
    }
    setQueryParams(newParams);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const generateCurlCommand = () => {
    const enabledHeaders = headers.filter((h) => h.enabled && h.key);
    const enabledParams = queryParams.filter((p) => p.enabled && p.key);
    const queryString = enabledParams.length ? '?' + enabledParams.map((p) => `${p.key}=${p.value}`).join('&') : '';
    const headerStrings = enabledHeaders.map((h) => `-H "${h.key}: ${h.value}"`).join(' \\\n  ');
    const bodyString = ['POST', 'PUT', 'PATCH'].includes(method) ? `\\\n  -d '${requestBody}'` : '';

    return `curl -X ${method} 'https://api.neurallempire.com${selectedEndpoint?.path || customPath}${queryString}' \\
  -H "Authorization: Bearer ${mockApiKey}" \\
  ${headerStrings}${bodyString}`;
  };

  const generateJavaScriptCode = () => {
    const enabledParams = queryParams.filter((p) => p.enabled && p.key);
    const queryString = enabledParams.length ? '?' + enabledParams.map((p) => `${p.key}=${p.value}`).join('&') : '';
    const enabledHeaders = headers.filter((h) => h.enabled && h.key);

    return `const response = await fetch('https://api.neurallempire.com${selectedEndpoint?.path || customPath}${queryString}', {
  method: '${method}',
  headers: {
    'Authorization': 'Bearer ${mockApiKey}',
${enabledHeaders.map((h) => `    '${h.key}': '${h.value}'`).join(',\n')}
  }${['POST', 'PUT', 'PATCH'].includes(method) ? `,\n  body: JSON.stringify(${requestBody})` : ''}
});

const data = await response.json();
console.log(data);`;
  };

  const generatePythonCode = () => {
    const enabledParams = queryParams.filter((p) => p.enabled && p.key);
    const queryString = enabledParams.length ? '?' + enabledParams.map((p) => `${p.key}=${p.value}`).join('&') : '';
    const enabledHeaders = headers.filter((h) => h.enabled && h.key);

    return `import requests

url = 'https://api.neurallempire.com${selectedEndpoint?.path || customPath}${queryString}'
headers = {
    'Authorization': 'Bearer ${mockApiKey}',
${enabledHeaders.map((h) => `    '${h.key}': '${h.value}'`).join(',\n')}
}
${['POST', 'PUT', 'PATCH'].includes(method) ? `\ndata = ${requestBody}\n` : ''}
response = requests.${method.toLowerCase()}(url, headers=headers${['POST', 'PUT', 'PATCH'].includes(method) ? ', json=data' : ''})
print(response.json())`;
  };

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'text-blue-600 bg-blue-100';
      case 'POST':
        return 'text-green-600 bg-green-100';
      case 'PUT':
        return 'text-yellow-600 bg-yellow-100';
      case 'DELETE':
        return 'text-red-600 bg-red-100';
      case 'PATCH':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">API Playground</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Test and explore NeurallEmpire API endpoints interactively</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Request Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Endpoint Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endpoint</label>
            <div className="relative">
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white pr-10"
                value={selectedEndpoint?.id || 'custom'}
                onChange={(e) => {
                  const endpoint = endpoints.find((ep) => ep.id === e.target.value);
                  if (endpoint) {
                    setSelectedEndpoint(endpoint);
                    setMethod(endpoint.method);
                    setCustomPath(endpoint.path);
                  } else {
                    setSelectedEndpoint(null);
                  }
                }}
              >
                <option value="custom">Custom Endpoint</option>
                {endpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.method} {endpoint.path} - {endpoint.description}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Method and Path */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-4">
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-semibold ${getMethodColor(
                    method
                  )}`}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Path</label>
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder="/api/v1/endpoint"
                />
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <Key className="w-4 h-4 mr-2" />
              Authentication Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={mockApiKey}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-gray-600 dark:text-gray-400"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mockApiKey);
                  setCopiedCode('token');
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
                className="px-3 py-2 btn-primary rounded-lg transition-colors"
              >
                {copiedCode === 'token' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">This token is automatically included in all requests</p>
          </div>

          {/* Query Parameters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Query Parameters</label>
              <button
                onClick={addQueryParam}
                className="text-sm text-indigo-600 hover:opacity-80 font-medium"
              >
                + Add Parameter
              </button>
            </div>
            <div className="space-y-2">
              {queryParams.map((param, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => updateQueryParam(index, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                    placeholder="Key"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => removeQueryParam(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Headers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Request Headers</label>
              <button onClick={addHeader} className="text-sm text-indigo-600 hover:opacity-80 font-medium">
                + Add Header
              </button>
            </div>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                    placeholder="Header Key"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                    placeholder="Header Value"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button onClick={() => removeHeader(index)} className="text-red-600 hover:text-red-700 p-1">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Request Body */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Code className="w-4 h-4 mr-2" />
                Request Body (JSON)
              </label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                placeholder='{\n  "key": "value"\n}'
              />
            </div>
          )}

          {/* Send Request Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendRequest}
              disabled={isLoading}
              className="flex-1 px-6 py-3 btn-primary rounded-lg transition-colors flex items-center justify-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Send Request
                </>
              )}
            </button>
            <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center font-medium">
              <Save className="w-5 h-5 mr-2" />
              Save
            </button>
          </div>

          {/* Response */}
          {response && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Zap className="w-5 h-5 mr-2 icon-active" />
                  Response
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`font-semibold ${getStatusColor(response.status)}`}>
                      {response.status} {response.statusText}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{response.responseTime}ms</span>
                  </div>
                </div>
              </div>

              {/* Response Headers */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Headers</p>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      <span className="icon-active">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Body */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Body</p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                    {JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-4 flex items-center gap-2">
                {response.status >= 200 && response.status < 300 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Request successful</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-600 font-medium">Request failed</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Code Examples & Collections */}
        <div className="lg:col-span-1 space-y-6">
          {/* Code Examples */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <FileCode className="w-5 h-5 mr-2 icon-active" />
              Code Examples
            </h3>

            {/* Code Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                onClick={() => setActiveCodeTab('curl')}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                  activeCodeTab === 'curl'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveCodeTab('javascript')}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                  activeCodeTab === 'javascript'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                JavaScript
              </button>
              <button
                onClick={() => setActiveCodeTab('python')}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                  activeCodeTab === 'python'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Python
              </button>
            </div>

            {/* Code Display */}
            <div className="relative">
              <button
                onClick={() => {
                  const code =
                    activeCodeTab === 'curl'
                      ? generateCurlCommand()
                      : activeCodeTab === 'javascript'
                      ? generateJavaScriptCode()
                      : generatePythonCode();
                  copyCode(code, activeCodeTab);
                }}
                className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors z-10"
              >
                {copiedCode === activeCodeTab ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                  {activeCodeTab === 'curl' && generateCurlCommand()}
                  {activeCodeTab === 'javascript' && generateJavaScriptCode()}
                  {activeCodeTab === 'python' && generatePythonCode()}
                </pre>
              </div>
            </div>
          </div>

          {/* Saved Collections */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Book className="w-5 h-5 mr-2 icon-active" />
              Saved Collections
            </h3>
            <div className="space-y-2">
              {savedCollections.map((collection, index) => (
                <button
                  key={index}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{collection}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 transform -rotate-90" />
                </button>
              ))}
              <button className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                + New Collection
              </button>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Quick Tips</h4>
                <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                  <li>• Use {'{id}'} in path for dynamic values</li>
                  <li>• All requests require authentication</li>
                  <li>• Rate limit: 1000 requests/hour</li>
                  <li>• Save frequently used requests</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIPlayground;
