import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  FileText,
  Search,
  Plus,
  Star,
  TrendingUp,
  Users,
  Building2,
  Zap,
  Mail,
  MessageSquare,
  BarChart3,
  Target,
  Briefcase,
  Globe,
  Heart,
  ShoppingBag,
  Code,
  Cpu,
  Bot,
  Workflow,
  Play,
  Eye,
  X,
  Crown,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'Agent Templates' | 'Campaign Templates' | 'Workflow Templates';
  type: 'official' | 'community';
  tags: string[];
  icon: React.ReactNode;
  author: string;
  uses: number;
  rating: number;
  trending: boolean;
  popular: boolean;
  preview?: string;
  createdAt: string;
}

const Templates: React.FC = () => {
  const { } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Agent Templates' | 'Campaign Templates' | 'Workflow Templates'>(
    'Agent Templates'
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'official' | 'community'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'trending'>('popular');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Mock templates data
  const templates: Template[] = [
    // Agent Templates
    {
      id: 'a1',
      name: 'Sales Development Rep',
      description: 'AI agent that qualifies leads, schedules meetings, and manages initial outreach',
      category: 'Agent Templates',
      type: 'official',
      tags: ['Sales', 'Lead Generation', 'B2B'],
      icon: <Briefcase className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 2847,
      rating: 4.8,
      trending: true,
      popular: true,
      preview: 'Complete SDR workflow with lead qualification, email sequences, and follow-up automation',
      createdAt: '2025-01-15',
    },
    {
      id: 'a2',
      name: 'Customer Support Agent',
      description: 'Handle customer inquiries, provide instant responses, and escalate complex issues',
      category: 'Agent Templates',
      type: 'official',
      tags: ['Support', 'Customer Service', 'Automation'],
      icon: <MessageSquare className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1923,
      rating: 4.9,
      trending: false,
      popular: true,
      preview: '24/7 customer support with knowledge base integration and smart escalation',
      createdAt: '2025-02-10',
    },
    {
      id: 'a3',
      name: 'Content Marketing Agent',
      description: 'Research topics, generate content ideas, and draft engaging marketing copy',
      category: 'Agent Templates',
      type: 'official',
      tags: ['Marketing', 'Content', 'SEO'],
      icon: <FileText className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1456,
      rating: 4.7,
      trending: true,
      popular: true,
      preview: 'AI-powered content creation with SEO optimization and topic research',
      createdAt: '2025-03-05',
    },
    {
      id: 'a4',
      name: 'Data Analyst Agent',
      description: 'Analyze data trends, generate reports, and provide actionable insights',
      category: 'Agent Templates',
      type: 'community',
      tags: ['Analytics', 'Data', 'Reporting'],
      icon: <BarChart3 className="w-6 h-6" />,
      author: 'DataPro Inc',
      uses: 892,
      rating: 4.6,
      trending: false,
      popular: false,
      preview: 'Automated data analysis with custom reporting and visualization',
      createdAt: '2025-04-20',
    },
    {
      id: 'a5',
      name: 'E-commerce Assistant',
      description: 'Manage product listings, answer shopping questions, and process orders',
      category: 'Agent Templates',
      type: 'community',
      tags: ['E-commerce', 'Retail', 'Sales'],
      icon: <ShoppingBag className="w-6 h-6" />,
      author: 'ShopAI',
      uses: 734,
      rating: 4.5,
      trending: false,
      popular: false,
      preview: 'Complete e-commerce support from product queries to order processing',
      createdAt: '2025-05-12',
    },
    {
      id: 'a6',
      name: 'HR Recruitment Agent',
      description: 'Screen candidates, schedule interviews, and manage hiring pipeline',
      category: 'Agent Templates',
      type: 'official',
      tags: ['HR', 'Recruitment', 'Hiring'],
      icon: <Users className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1167,
      rating: 4.7,
      trending: false,
      popular: true,
      preview: 'Streamline your hiring process with automated candidate screening',
      createdAt: '2025-06-08',
    },
    {
      id: 'a7',
      name: 'Technical Support Bot',
      description: 'Troubleshoot technical issues, provide solutions, and create tickets',
      category: 'Agent Templates',
      type: 'community',
      tags: ['Support', 'Technical', 'IT'],
      icon: <Code className="w-6 h-6" />,
      author: 'TechSupport Pro',
      uses: 645,
      rating: 4.4,
      trending: false,
      popular: false,
      preview: 'AI-powered technical support with knowledge base and ticketing integration',
      createdAt: '2025-07-15',
    },

    // Campaign Templates
    {
      id: 'c1',
      name: 'Product Launch Campaign',
      description: 'Multi-channel campaign for new product launches with email, social, and ads',
      category: 'Campaign Templates',
      type: 'official',
      tags: ['Product Launch', 'Marketing', 'Multi-channel'],
      icon: <Zap className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 3241,
      rating: 4.9,
      trending: true,
      popular: true,
      preview: 'Comprehensive launch campaign with coordinated messaging across all channels',
      createdAt: '2025-01-20',
    },
    {
      id: 'c2',
      name: 'Lead Nurturing Sequence',
      description: 'Automated email sequence to nurture leads through the sales funnel',
      category: 'Campaign Templates',
      type: 'official',
      tags: ['Email', 'Lead Nurturing', 'Sales'],
      icon: <Mail className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 2156,
      rating: 4.8,
      trending: false,
      popular: true,
      preview: '7-day email sequence with personalization and behavioral triggers',
      createdAt: '2025-02-15',
    },
    {
      id: 'c3',
      name: 'Customer Onboarding',
      description: 'Welcome new customers with personalized onboarding experience',
      category: 'Campaign Templates',
      type: 'official',
      tags: ['Onboarding', 'Customer Success', 'Retention'],
      icon: <Users className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1834,
      rating: 4.7,
      trending: true,
      popular: true,
      preview: 'Complete onboarding flow with tutorials, tips, and milestone celebrations',
      createdAt: '2025-03-10',
    },
    {
      id: 'c4',
      name: 'Re-engagement Campaign',
      description: 'Win back inactive customers with targeted messaging',
      category: 'Campaign Templates',
      type: 'community',
      tags: ['Retention', 'Email', 'Win-back'],
      icon: <Heart className="w-6 h-6" />,
      author: 'Marketing Masters',
      uses: 967,
      rating: 4.5,
      trending: false,
      popular: false,
      preview: 'Strategic re-engagement sequence with special offers and personalization',
      createdAt: '2025-04-25',
    },
    {
      id: 'c5',
      name: 'Event Promotion',
      description: 'Drive registrations and attendance for webinars and events',
      category: 'Campaign Templates',
      type: 'official',
      tags: ['Events', 'Webinar', 'Registration'],
      icon: <Globe className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1423,
      rating: 4.6,
      trending: false,
      popular: true,
      preview: 'Full event marketing cycle from promotion to post-event follow-up',
      createdAt: '2025-05-18',
    },
    {
      id: 'c6',
      name: 'Black Friday Sale',
      description: 'High-converting holiday sale campaign with urgency and scarcity',
      category: 'Campaign Templates',
      type: 'community',
      tags: ['E-commerce', 'Sales', 'Holiday'],
      icon: <ShoppingBag className="w-6 h-6" />,
      author: 'RetailGenius',
      uses: 2089,
      rating: 4.8,
      trending: true,
      popular: true,
      preview: 'Proven Black Friday campaign template with countdown timers and urgency',
      createdAt: '2025-06-22',
    },

    // Workflow Templates
    {
      id: 'w1',
      name: 'Lead Scoring & Routing',
      description: 'Automatically score leads and route them to the right sales rep',
      category: 'Workflow Templates',
      type: 'official',
      tags: ['Sales', 'Automation', 'Lead Management'],
      icon: <Target className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 2567,
      rating: 4.9,
      trending: true,
      popular: true,
      preview: 'Intelligent lead scoring with automatic assignment based on territory and skills',
      createdAt: '2025-01-25',
    },
    {
      id: 'w2',
      name: 'Customer Feedback Loop',
      description: 'Collect, analyze, and act on customer feedback automatically',
      category: 'Workflow Templates',
      type: 'official',
      tags: ['Feedback', 'Customer Success', 'Analytics'],
      icon: <MessageSquare className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1678,
      rating: 4.7,
      trending: false,
      popular: true,
      preview: 'Automated feedback collection with sentiment analysis and action triggers',
      createdAt: '2025-02-28',
    },
    {
      id: 'w3',
      name: 'Deal Pipeline Automation',
      description: 'Move deals through pipeline stages based on actions and criteria',
      category: 'Workflow Templates',
      type: 'official',
      tags: ['Sales', 'CRM', 'Pipeline'],
      icon: <Workflow className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1945,
      rating: 4.8,
      trending: false,
      popular: true,
      preview: 'Smart pipeline management with automatic stage progression and notifications',
      createdAt: '2025-03-15',
    },
    {
      id: 'w4',
      name: 'Content Publishing Workflow',
      description: 'Streamline content creation, review, and publishing process',
      category: 'Workflow Templates',
      type: 'community',
      tags: ['Content', 'Marketing', 'Publishing'],
      icon: <FileText className="w-6 h-6" />,
      author: 'ContentFlow',
      uses: 823,
      rating: 4.5,
      trending: false,
      popular: false,
      preview: 'End-to-end content workflow from ideation to publication with approvals',
      createdAt: '2025-04-30',
    },
    {
      id: 'w5',
      name: 'Support Ticket Routing',
      description: 'Intelligently route support tickets to the right team or agent',
      category: 'Workflow Templates',
      type: 'official',
      tags: ['Support', 'Automation', 'Ticketing'],
      icon: <Users className="w-6 h-6" />,
      author: 'NeurallEmpire',
      uses: 1534,
      rating: 4.7,
      trending: true,
      popular: true,
      preview: 'Smart ticket routing based on issue type, priority, and agent expertise',
      createdAt: '2025-05-20',
    },
    {
      id: 'w6',
      name: 'Data Sync Automation',
      description: 'Keep data in sync across multiple platforms and tools',
      category: 'Workflow Templates',
      type: 'community',
      tags: ['Integration', 'Data', 'Sync'],
      icon: <Cpu className="w-6 h-6" />,
      author: 'SyncMaster',
      uses: 1267,
      rating: 4.6,
      trending: false,
      popular: false,
      preview: 'Bi-directional data sync with conflict resolution and error handling',
      createdAt: '2025-06-12',
    },
    {
      id: 'w7',
      name: 'Invoice & Payment Automation',
      description: 'Automate invoice generation, sending, and payment tracking',
      category: 'Workflow Templates',
      type: 'community',
      tags: ['Finance', 'Billing', 'Automation'],
      icon: <Building2 className="w-6 h-6" />,
      author: 'FinanceAuto',
      uses: 945,
      rating: 4.4,
      trending: false,
      popular: false,
      preview: 'Complete billing automation from invoice creation to payment reconciliation',
      createdAt: '2025-07-08',
    },
  ];

  const allTags = Array.from(new Set(templates.flatMap((t) => t.tags))).sort();

  const filteredTemplates = templates
    .filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = template.category === activeCategory;
      const matchesType = typeFilter === 'all' || template.type === typeFilter;
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => template.tags.includes(tag));
      return matchesSearch && matchesCategory && matchesType && matchesTags;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.uses - a.uses;
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'trending':
          return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
        default:
          return 0;
      }
    });

  const popularTemplates = templates
    .filter((t) => t.popular && t.category === activeCategory)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 3);

  const trendingTemplates = templates
    .filter((t) => t.trending && t.category === activeCategory)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 3);

  const handleUseTemplate = (template: Template) => {
    console.log('Using template:', template.name);
    // Implementation would handle template usage
  };

  const handlePreviewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Templates</h1>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-2">Browse and use pre-built templates to accelerate your workflow</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{templates.length}</p>
            </div>
            <FileText className="w-8 h-8 icon-active" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Official</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{templates.filter((t) => t.type === 'official').length}</p>
            </div>
            <Crown className="w-8 h-8 icon-active" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Community</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{templates.filter((t) => t.type === 'community').length}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Total Uses</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {templates.reduce((sum, t) => sum + t.uses, 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveCategory('Agent Templates')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === 'Agent Templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Bot className="w-4 h-4 inline mr-2" />
              Agent Templates
            </button>
            <button
              onClick={() => setActiveCategory('Campaign Templates')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === 'Campaign Templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Campaign Templates
            </button>
            <button
              onClick={() => setActiveCategory('Workflow Templates')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === 'Workflow Templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Workflow className="w-4 h-4 inline mr-2" />
              Workflow Templates
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'official' | 'community')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="official">Official</option>
                <option value="community">Community</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'popular' | 'recent' | 'trending')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="popular">Most Popular</option>
                <option value="recent">Most Recent</option>
                <option value="trending">Trending</option>
              </select>

              <button className="px-4 py-2 btn-primary rounded-lg transition-colors flex items-center whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Create from Scratch
              </button>
            </div>
          </div>

          {/* Tags Filter */}
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 10).map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Templates Section */}
      {searchQuery === '' && selectedTags.length === 0 && popularTemplates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Popular {activeCategory}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {popularTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-primary-200 dark:border-primary-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    {template.icon}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{template.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">{template.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-white text-indigo-700">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
                  <span className="flex items-center">
                    {template.type === 'official' ? (
                      <>
                        <Crown className="w-3 h-3 mr-1 icon-active" />
                        Official
                      </>
                    ) : (
                      <>
                        <Users className="w-3 h-3 mr-1" />
                        Community
                      </>
                    )}
                  </span>
                  <span>{template.uses.toLocaleString()} uses</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1 px-4 py-2 btn-primary rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Use Template
                  </button>
                  <button
                    onClick={() => handlePreviewTemplate(template)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Templates Section */}
      {searchQuery === '' && selectedTags.length === 0 && trendingTemplates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
            Trending {activeCategory}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingTemplates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    {template.icon}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Trending
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">{template.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
                  <span className="flex items-center">
                    {template.type === 'official' ? (
                      <>
                        <Crown className="w-3 h-3 mr-1 icon-active" />
                        Official
                      </>
                    ) : (
                      <>
                        <Users className="w-3 h-3 mr-1" />
                        Community
                      </>
                    )}
                  </span>
                  <span>{template.uses.toLocaleString()} uses</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1 px-4 py-2 btn-primary rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Use Template
                  </button>
                  <button
                    onClick={() => handlePreviewTemplate(template)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Templates Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          All {activeCategory} {filteredTemplates.length > 0 && `(${filteredTemplates.length})`}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  {template.icon}
                </div>
                <div className="flex items-center space-x-2">
                  {template.trending && (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <TrendingUp className="w-3 h-3" />
                    </span>
                  )}
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{template.rating}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">{template.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {template.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
                <span className="flex items-center">
                  {template.type === 'official' ? (
                    <>
                      <Crown className="w-3 h-3 mr-1 icon-active" />
                      Official
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3 mr-1" />
                      {template.author}
                    </>
                  )}
                </span>
                <span>{template.uses.toLocaleString()} uses</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 px-4 py-2 btn-primary rounded-lg transition-colors flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Use Template
                </button>
                <button
                  onClick={() => handlePreviewTemplate(template)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No templates found matching your criteria</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTags([]);
                setTypeFilter('all');
              }}
              className="px-4 py-2 btn-primary rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreviewModalOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  {selectedTemplate.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{selectedTemplate.name}</h2>
                  <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    <span className="flex items-center">
                      {selectedTemplate.type === 'official' ? (
                        <>
                          <Crown className="w-4 h-4 mr-1 icon-active" />
                          {selectedTemplate.author}
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-1" />
                          {selectedTemplate.author}
                        </>
                      )}
                    </span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
                      {selectedTemplate.rating}
                    </span>
                    <span>•</span>
                    <span>{selectedTemplate.uses.toLocaleString()} uses</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{selectedTemplate.description}</p>
            </div>

            {selectedTemplate.preview && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">What's Included</h3>
                <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{selectedTemplate.preview}</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag, index) => (
                  <span key={index} className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleUseTemplate(selectedTemplate);
                  setIsPreviewModalOpen(false);
                }}
                className="px-6 py-2 btn-primary rounded-lg transition-colors flex items-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
