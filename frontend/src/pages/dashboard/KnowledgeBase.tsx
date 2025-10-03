import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  BookOpen,
  Search,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Home,
  Code,
  Book,
  HelpCircle,
  AlertTriangle,
  FileText,
  Star,
  Clock,
  TrendingUp,
  X,
  Check,
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt: string;
  views: number;
  helpful: number;
  lastUpdated: string;
  tags: string[];
  featured?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  count: number;
}

const KnowledgeBase: React.FC = () => {
  const {} = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [feedback, setFeedback] = useState<{ [key: string]: 'helpful' | 'not-helpful' | null }>({});

  const categories: Category[] = [
    { id: 'getting-started', name: 'Getting Started', icon: Home, count: 8 },
    { id: 'api-reference', name: 'API Reference', icon: Code, count: 15 },
    { id: 'guides', name: 'Guides', icon: Book, count: 12 },
    { id: 'faqs', name: 'FAQs', icon: HelpCircle, count: 20 },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: AlertTriangle, count: 10 },
  ];

  const articles: Article[] = [
    {
      id: '1',
      title: 'Quick Start Guide',
      category: 'getting-started',
      excerpt: 'Get up and running with NeurallEmpire in less than 5 minutes',
      content: '# Quick Start Guide\n\nWelcome to NeurallEmpire! This guide will help you get started quickly.\n\n## Step 1: Create Your Account\n\nSign up for a free account to get started...\n\n## Step 2: Set Up Your First Agent\n\nNavigate to the Agents page and click "Create New Agent"...',
      views: 15234,
      helpful: 1456,
      lastUpdated: '2025-09-28',
      tags: ['getting-started', 'beginner', 'setup'],
      featured: true,
    },
    {
      id: '2',
      title: 'Authentication & API Keys',
      category: 'api-reference',
      excerpt: 'Learn how to authenticate your API requests using API keys',
      content: '# Authentication & API Keys\n\nAll API requests require authentication using API keys...',
      views: 12890,
      helpful: 1234,
      lastUpdated: '2025-10-01',
      tags: ['api', 'authentication', 'security'],
      featured: true,
    },
    {
      id: '3',
      title: 'Creating Your First Campaign',
      category: 'guides',
      excerpt: 'Step-by-step guide to creating and launching your first campaign',
      content: '# Creating Your First Campaign\n\nCampaigns allow you to reach your audience at scale...',
      views: 9876,
      helpful: 987,
      lastUpdated: '2025-09-25',
      tags: ['campaigns', 'guide', 'tutorial'],
      featured: true,
    },
    {
      id: '4',
      title: 'REST API Endpoints',
      category: 'api-reference',
      excerpt: 'Complete reference of all available REST API endpoints',
      content: '# REST API Endpoints\n\n## Base URL\n\n`https://api.neurallempire.com/v1`\n\n## Endpoints\n\n### GET /agents\n\nRetrieve all agents...',
      views: 11234,
      helpful: 1123,
      lastUpdated: '2025-10-02',
      tags: ['api', 'reference', 'endpoints'],
    },
    {
      id: '5',
      title: 'How do I reset my password?',
      category: 'faqs',
      excerpt: 'Instructions for resetting your password if you forgot it',
      content: '# How do I reset my password?\n\nIf you forgot your password, follow these steps...',
      views: 8765,
      helpful: 876,
      lastUpdated: '2025-09-30',
      tags: ['account', 'password', 'security'],
    },
    {
      id: '6',
      title: 'Webhook Integration Guide',
      category: 'guides',
      excerpt: 'Learn how to set up webhooks to receive real-time events',
      content: '# Webhook Integration Guide\n\nWebhooks allow you to receive real-time notifications...',
      views: 7654,
      helpful: 765,
      lastUpdated: '2025-09-27',
      tags: ['webhooks', 'integration', 'events'],
      featured: true,
    },
    {
      id: '7',
      title: 'Rate Limits & Quotas',
      category: 'api-reference',
      excerpt: 'Understanding API rate limits and how to handle them',
      content: '# Rate Limits & Quotas\n\nAPI rate limits help ensure fair usage...',
      views: 6543,
      helpful: 654,
      lastUpdated: '2025-09-29',
      tags: ['api', 'rate-limits', 'quotas'],
    },
    {
      id: '8',
      title: 'Team Management Best Practices',
      category: 'guides',
      excerpt: 'Tips for effectively managing your team in NeurallEmpire',
      content: '# Team Management Best Practices\n\nManaging a team effectively requires...',
      views: 5432,
      helpful: 543,
      lastUpdated: '2025-09-26',
      tags: ['team', 'collaboration', 'management'],
    },
    {
      id: '9',
      title: 'API returns 401 Unauthorized',
      category: 'troubleshooting',
      excerpt: 'How to fix authentication errors in API requests',
      content: '# API returns 401 Unauthorized\n\nIf you receive a 401 error, it means...',
      views: 9876,
      helpful: 987,
      lastUpdated: '2025-10-03',
      tags: ['troubleshooting', 'api', 'errors'],
    },
    {
      id: '10',
      title: 'Data Export & Backup',
      category: 'guides',
      excerpt: 'How to export and backup your data from NeurallEmpire',
      content: '# Data Export & Backup\n\nRegularly backing up your data is important...',
      views: 4321,
      helpful: 432,
      lastUpdated: '2025-09-24',
      tags: ['data', 'export', 'backup'],
    },
    {
      id: '11',
      title: 'What payment methods do you accept?',
      category: 'faqs',
      excerpt: 'Information about accepted payment methods and billing',
      content: '# What payment methods do you accept?\n\nWe accept all major credit cards...',
      views: 7890,
      helpful: 789,
      lastUpdated: '2025-09-28',
      tags: ['billing', 'payment', 'subscription'],
    },
    {
      id: '12',
      title: 'Error Handling & Retries',
      category: 'api-reference',
      excerpt: 'Best practices for handling errors and implementing retries',
      content: '# Error Handling & Retries\n\nProper error handling is crucial...',
      views: 5678,
      helpful: 567,
      lastUpdated: '2025-10-01',
      tags: ['api', 'errors', 'best-practices'],
    },
    {
      id: '13',
      title: 'Custom Domain Setup',
      category: 'guides',
      excerpt: 'Configure a custom domain for your NeurallEmpire workspace',
      content: '# Custom Domain Setup\n\nYou can use your own domain...',
      views: 3456,
      helpful: 345,
      lastUpdated: '2025-09-25',
      tags: ['domain', 'dns', 'configuration'],
    },
    {
      id: '14',
      title: 'Agent not responding',
      category: 'troubleshooting',
      excerpt: 'Troubleshooting steps when your agent is not responding',
      content: '# Agent not responding\n\nIf your agent is not responding, try these steps...',
      views: 6789,
      helpful: 678,
      lastUpdated: '2025-10-02',
      tags: ['troubleshooting', 'agents', 'issues'],
    },
    {
      id: '15',
      title: 'Webhook Payload Reference',
      category: 'api-reference',
      excerpt: 'Complete reference of webhook payload structures',
      content: '# Webhook Payload Reference\n\nWebhooks send payloads in JSON format...',
      views: 4567,
      helpful: 456,
      lastUpdated: '2025-09-29',
      tags: ['webhooks', 'reference', 'payloads'],
    },
    {
      id: '16',
      title: 'How do I upgrade my plan?',
      category: 'faqs',
      excerpt: 'Steps to upgrade your subscription plan',
      content: '# How do I upgrade my plan?\n\nTo upgrade your plan, follow these steps...',
      views: 8901,
      helpful: 890,
      lastUpdated: '2025-09-27',
      tags: ['billing', 'upgrade', 'subscription'],
    },
    {
      id: '17',
      title: 'Analytics & Reporting',
      category: 'guides',
      excerpt: 'Understanding analytics and generating custom reports',
      content: '# Analytics & Reporting\n\nAnalytics help you understand your data...',
      views: 5234,
      helpful: 523,
      lastUpdated: '2025-09-26',
      tags: ['analytics', 'reporting', 'data'],
    },
    {
      id: '18',
      title: 'Campaign delivery issues',
      category: 'troubleshooting',
      excerpt: 'Resolving issues with campaign delivery',
      content: '# Campaign delivery issues\n\nIf your campaigns are not being delivered...',
      views: 7123,
      helpful: 712,
      lastUpdated: '2025-10-03',
      tags: ['troubleshooting', 'campaigns', 'delivery'],
    },
    {
      id: '19',
      title: 'Security Best Practices',
      category: 'guides',
      excerpt: 'Essential security practices for your NeurallEmpire account',
      content: '# Security Best Practices\n\nSecurity is paramount...',
      views: 6234,
      helpful: 623,
      lastUpdated: '2025-09-30',
      tags: ['security', 'best-practices', 'safety'],
    },
    {
      id: '20',
      title: 'Pagination & Filtering',
      category: 'api-reference',
      excerpt: 'How to paginate and filter API responses',
      content: '# Pagination & Filtering\n\nLarge result sets are paginated...',
      views: 5890,
      helpful: 589,
      lastUpdated: '2025-10-01',
      tags: ['api', 'pagination', 'filtering'],
    },
    {
      id: '21',
      title: 'Can I cancel my subscription?',
      category: 'faqs',
      excerpt: 'Information about canceling your subscription',
      content: '# Can I cancel my subscription?\n\nYes, you can cancel anytime...',
      views: 9012,
      helpful: 901,
      lastUpdated: '2025-09-28',
      tags: ['billing', 'cancellation', 'subscription'],
    },
    {
      id: '22',
      title: 'Slow API response times',
      category: 'troubleshooting',
      excerpt: 'Diagnosing and fixing slow API response times',
      content: '# Slow API response times\n\nSlow responses can be caused by...',
      views: 5678,
      helpful: 567,
      lastUpdated: '2025-10-02',
      tags: ['troubleshooting', 'performance', 'api'],
    },
  ];

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = articles.filter((article) => article.featured);
  const recentArticles = [...articles]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);
  const popularArticles = [...articles].sort((a, b) => b.views - a.views).slice(0, 5);

  const handleFeedback = (articleId: string, type: 'helpful' | 'not-helpful') => {
    setFeedback((prev) => ({ ...prev, [articleId]: type }));
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.icon || FileText;
  };

  if (selectedArticle) {
    const CategoryIcon = getCategoryIcon(selectedArticle.category);
    const currentFeedback = feedback[selectedArticle.id];

    return (
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center text-sm text-gray-600">
          <button onClick={() => setSelectedArticle(null)} className="hover:text-indigo-600 transition-colors">
            Knowledge Base
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900">{selectedArticle.title}</span>
        </div>

        {/* Article Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                <CategoryIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedArticle.title}</h1>
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  Updated {new Date(selectedArticle.lastUpdated).toLocaleDateString()}
                  <span className="mx-2">•</span>
                  {selectedArticle.views.toLocaleString()} views
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedArticle(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedArticle.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Article Content */}
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{selectedArticle.content}</div>
          </div>

          {/* Feedback Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-3">Was this article helpful?</p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleFeedback(selectedArticle.id, 'helpful')}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center ${
                  currentFeedback === 'helpful'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Yes, helpful
                {currentFeedback === 'helpful' && <Check className="w-4 h-4 ml-2" />}
              </button>
              <button
                onClick={() => handleFeedback(selectedArticle.id, 'not-helpful')}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center ${
                  currentFeedback === 'not-helpful'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                No, not helpful
                {currentFeedback === 'not-helpful' && <Check className="w-4 h-4 ml-2" />}
              </button>
            </div>
            {currentFeedback && (
              <p className="mt-3 text-sm text-gray-600">Thank you for your feedback!</p>
            )}
          </div>
        </div>

        {/* Related Articles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Articles</h3>
          <div className="space-y-3">
            {articles
              .filter(
                (article) =>
                  article.id !== selectedArticle.id &&
                  article.category === selectedArticle.category
              )
              .slice(0, 3)
              .map((article) => {
                const Icon = getCategoryIcon(article.category);
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="w-full flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <Icon className="w-5 h-5 text-indigo-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 hover:text-indigo-600">{article.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{article.excerpt}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
        <p className="text-gray-600 mt-2">Find answers, guides, and documentation</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search articles, guides, and documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium">All Articles</span>
                <span className="text-xs">{articles.length}</span>
              </button>
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs">{category.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Featured Articles */}
          {selectedCategory === 'all' && searchQuery === '' && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Featured Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredArticles.map((article) => {
                  const Icon = getCategoryIcon(article.category);
                  return (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 text-left hover:shadow-md transition-all border border-indigo-100"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="w-6 h-6 text-indigo-600" />
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{article.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{article.excerpt}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(article.lastUpdated).toLocaleDateString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popular & Recent Articles */}
          {selectedCategory === 'all' && searchQuery === '' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Popular Articles */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Popular Articles
                </h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="space-y-3">
                    {popularArticles.map((article, index) => {
                      const Icon = getCategoryIcon(article.category);
                      return (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className="w-full flex items-start p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 font-bold text-xs mr-3 flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <Icon className="w-4 h-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{article.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{article.views.toLocaleString()} views</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Articles */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Articles
                </h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="space-y-3">
                    {recentArticles.map((article) => {
                      const Icon = getCategoryIcon(article.category);
                      return (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className="w-full flex items-start p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <Icon className="w-4 h-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{article.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Updated {new Date(article.lastUpdated).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Articles List */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
              {selectedCategory === 'all' ? 'All Articles' : categories.find((c) => c.id === selectedCategory)?.name}
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No articles found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredArticles.map((article) => {
                    const Icon = getCategoryIcon(article.category);
                    return (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="w-full flex items-start p-6 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">{article.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{article.excerpt}</p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(article.lastUpdated).toLocaleDateString()}
                                <span className="mx-2">•</span>
                                {article.views.toLocaleString()} views
                                <span className="mx-2">•</span>
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                {article.helpful} helpful
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
