import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Inbox,
  Send,
  Archive,
  Mail,
  Search,
  Plus,
  X,
  Paperclip,
  Star,
  StarOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter
} from 'lucide-react';
import { getPriorityColor } from '@/utils/priorityColors';
import { formatTimeAgo } from '@/utils/formatters';

type MessageTab = 'inbox' | 'sent' | 'archived';
type MessagePriority = 'normal' | 'high' | 'urgent';

interface Message {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  recipientEmail: string;
  preview: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isFlagged: boolean;
  priority: MessagePriority;
  attachments?: Attachment[];
  replies?: Reply[];
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

interface Reply {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

const Messages: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MessageTab>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Compose form state
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');

  // Mock data for demonstration
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      subject: 'Q4 Campaign Performance Review',
      sender: 'Sarah Johnson',
      senderEmail: 'sarah.j@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'Hey team, I wanted to share the latest performance metrics from our Q4 campaigns. The results are looking great...',
      content: 'Hey team,\n\nI wanted to share the latest performance metrics from our Q4 campaigns. The results are looking great with a 45% increase in engagement rates and a 28% boost in conversion.\n\nKey highlights:\n- Email open rate: 38% (up from 26%)\n- Click-through rate: 12% (up from 8%)\n- Conversion rate: 5.2% (up from 4.1%)\n\nLet\'s schedule a meeting to discuss scaling strategies for Q1.\n\nBest,\nSarah',
      timestamp: '2025-10-04T09:30:00Z',
      isRead: false,
      isFlagged: true,
      priority: 'high',
      attachments: [
        { id: '1', name: 'Q4-Campaign-Report.pdf', size: '2.4 MB', type: 'pdf' },
        { id: '2', name: 'Performance-Metrics.xlsx', size: '1.1 MB', type: 'excel' }
      ],
      replies: [
        {
          id: '1',
          sender: 'Michael Chen',
          content: 'Great results! I\'ll prepare the Q1 scaling proposal for our next meeting.',
          timestamp: '2025-10-04T10:15:00Z'
        }
      ]
    },
    {
      id: '2',
      subject: 'New AI Agent Template Available',
      sender: 'David Martinez',
      senderEmail: 'david.m@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'Hi everyone, we just released a new AI agent template for customer support automation. Check it out...',
      content: 'Hi everyone,\n\nWe just released a new AI agent template for customer support automation. This template includes:\n\n- Natural language understanding\n- Multi-channel support (email, chat, phone)\n- Automated ticket routing\n- Sentiment analysis\n- Knowledge base integration\n\nYou can find it in the Agent Templates section. Let me know if you have any questions!\n\nDavid',
      timestamp: '2025-10-04T08:15:00Z',
      isRead: false,
      isFlagged: false,
      priority: 'normal',
      attachments: [
        { id: '3', name: 'Template-Guide.pdf', size: '856 KB', type: 'pdf' }
      ]
    },
    {
      id: '3',
      subject: 'URGENT: API Rate Limit Warning',
      sender: 'System Alert',
      senderEmail: 'alerts@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'Your organization is approaching the API rate limit (85% used). Consider upgrading your plan...',
      content: 'Your organization is approaching the API rate limit:\n\nCurrent Usage: 85,000 / 100,000 requests\nRemaining: 15,000 requests\nResets: October 5, 2025\n\nTo avoid service interruption, consider:\n1. Upgrading to a higher tier plan\n2. Optimizing your API calls\n3. Implementing caching strategies\n\nContact support if you need assistance.',
      timestamp: '2025-10-04T07:45:00Z',
      isRead: true,
      isFlagged: true,
      priority: 'urgent',
    },
    {
      id: '4',
      subject: 'Weekly Team Sync - October 4',
      sender: 'Emily Davis',
      senderEmail: 'emily.d@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'Reminder: Our weekly team sync is scheduled for today at 2 PM. Agenda items include...',
      content: 'Hi team,\n\nReminder: Our weekly team sync is scheduled for today at 2 PM.\n\nAgenda:\n1. Q4 campaign review\n2. New feature releases\n3. Customer feedback discussion\n4. Sprint planning for next week\n\nMeeting Link: https://meet.neurallempire.com/weekly-sync\n\nSee you there!\nEmily',
      timestamp: '2025-10-04T06:30:00Z',
      isRead: true,
      isFlagged: false,
      priority: 'normal',
    },
    {
      id: '5',
      subject: 'Customer Success Story: TechCorp Implementation',
      sender: 'Rachel Kim',
      senderEmail: 'rachel.k@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'I wanted to share an amazing success story from TechCorp. They saw a 300% ROI in just 3 months...',
      content: 'Hi team,\n\nI wanted to share an amazing success story from TechCorp:\n\n- 300% ROI in 3 months\n- 60% reduction in response time\n- 95% customer satisfaction score\n- Automated 80% of support tickets\n\nThis would make a great case study for our marketing materials. I\'ve attached the full report.\n\nBest,\nRachel',
      timestamp: '2025-10-03T16:20:00Z',
      isRead: true,
      isFlagged: false,
      priority: 'normal',
      attachments: [
        { id: '4', name: 'TechCorp-Case-Study.pdf', size: '3.2 MB', type: 'pdf' }
      ]
    },
    {
      id: '6',
      subject: 'Security Update Required',
      sender: 'System Security',
      senderEmail: 'security@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'A security update is available for your account. Please update your password and enable 2FA...',
      content: 'Security Notice:\n\nWe recommend updating your security settings:\n\n1. Change your password (last changed 45 days ago)\n2. Enable two-factor authentication\n3. Review active sessions\n4. Update recovery email\n\nThese steps will help protect your account from unauthorized access.\n\nSecurity Team',
      timestamp: '2025-10-03T14:10:00Z',
      isRead: false,
      isFlagged: true,
      priority: 'high',
    },
    {
      id: '7',
      subject: 'New Integration: Salesforce Connector',
      sender: 'Product Team',
      senderEmail: 'product@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'Exciting news! We just launched our Salesforce integration. Connect your CRM data seamlessly...',
      content: 'Hi there,\n\nExciting news! We just launched our Salesforce integration.\n\nFeatures:\n- Bi-directional sync\n- Real-time updates\n- Custom field mapping\n- Automated lead scoring\n- Activity tracking\n\nCheck out the documentation to get started: docs.neurallempire.com/integrations/salesforce\n\nProduct Team',
      timestamp: '2025-10-03T11:30:00Z',
      isRead: true,
      isFlagged: false,
      priority: 'normal',
    },
    {
      id: '8',
      subject: 'Feedback Request: Dashboard Redesign',
      sender: 'UX Team',
      senderEmail: 'ux@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'We\'re redesigning the dashboard and would love your input. Take our 5-minute survey...',
      content: 'Hello,\n\nWe\'re redesigning the dashboard and would love your input!\n\nPlease take our 5-minute survey:\nhttps://survey.neurallempire.com/dashboard-redesign\n\nYour feedback helps us build better products.\n\nThank you!\nUX Team',
      timestamp: '2025-10-02T15:45:00Z',
      isRead: true,
      isFlagged: false,
      priority: 'normal',
    },
    {
      id: '9',
      subject: 'Billing: Invoice Available',
      sender: 'Billing Team',
      senderEmail: 'billing@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'Your invoice for September 2025 is now available. Total: $2,499.00...',
      content: 'Your invoice is ready:\n\nInvoice #INV-2025-09-001\nPeriod: September 1-30, 2025\nAmount: $2,499.00\nStatus: Paid\n\nView invoice: https://neurallempire.com/billing/invoices/INV-2025-09-001\n\nThank you for your business!\nBilling Team',
      timestamp: '2025-10-01T09:00:00Z',
      isRead: true,
      isFlagged: false,
      priority: 'normal',
      attachments: [
        { id: '5', name: 'Invoice-September-2025.pdf', size: '445 KB', type: 'pdf' }
      ]
    },
    {
      id: '10',
      subject: 'Welcome to NeurallEmpire!',
      sender: 'Onboarding Team',
      senderEmail: 'onboarding@neurallempire.com',
      recipient: user?.firstName + ' ' + user?.lastName || 'You',
      recipientEmail: user?.email || '',
      preview: 'Welcome aboard! Here\'s everything you need to get started with NeurallEmpire...',
      content: 'Welcome to NeurallEmpire!\n\nHere\'s your getting started guide:\n\n1. Complete your profile\n2. Set up your first AI agent\n3. Configure integrations\n4. Invite team members\n5. Explore our knowledge base\n\nNeed help? Our support team is available 24/7.\n\nLet\'s build something amazing together!\n\nOnboarding Team',
      timestamp: '2025-09-28T10:00:00Z',
      isRead: true,
      isFlagged: false,
      priority: 'normal',
    }
  ]);

  const getFilteredMessages = () => {
    let filtered = messages;

    // Filter by tab
    if (activeTab === 'inbox') {
      filtered = filtered.filter(m => m.recipientEmail === user?.email);
    } else if (activeTab === 'sent') {
      filtered = filtered.filter(m => m.senderEmail === user?.email);
    } else if (activeTab === 'archived') {
      filtered = []; // In a real app, fetch archived messages
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.preview.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(m => m.priority === filterPriority);
    }

    return filtered;
  };

  const filteredMessages = getFilteredMessages();
  const unreadCount = messages.filter(m => !m.isRead && m.recipientEmail === user?.email).length;

  const handleMarkAsRead = (messageId: string) => {
    setMessages(messages.map(m =>
      m.id === messageId ? { ...m, isRead: true } : m
    ));
  };

  const handleToggleFlag = (messageId: string) => {
    setMessages(messages.map(m =>
      m.id === messageId ? { ...m, isFlagged: !m.isFlagged } : m
    ));
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      setMessages(messages.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sending message:', { composeRecipient, composeSubject, composeMessage });
    // Add send logic here
    setIsComposeOpen(false);
    setComposeRecipient('');
    setComposeSubject('');
    setComposeMessage('');
  };



  // Team members for message recipient selector
  const teamMembers = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah.j@neurallempire.com' },
    { id: '2', name: 'Michael Chen', email: 'michael.c@neurallempire.com' },
    { id: '3', name: 'David Martinez', email: 'david.m@neurallempire.com' },
    { id: '4', name: 'Emily Davis', email: 'emily.d@neurallempire.com' },
    { id: '5', name: 'Rachel Kim', email: 'rachel.k@neurallempire.com' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Messages</h1>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-2">Team inbox and messaging center</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{messages.length}</p>
            </div>
            <Mail className="w-8 h-8 icon-active" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Unread</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{unreadCount}</p>
            </div>
            <Inbox className="w-8 h-8 icon-active" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Flagged</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {messages.filter(m => m.isFlagged).length}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Sent Today</p>
              <p className="text-2xl font-bold text-green-600 mt-1">0</p>
            </div>
            <Send className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex h-[calc(100vh-400px)] min-h-[600px]">
          {/* Message List */}
          <div className={`${selectedMessage ? 'hidden md:block' : 'block'} w-full md:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('inbox')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'inbox'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Inbox className="w-4 h-4 inline mr-2" />
                Inbox
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'sent'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Send className="w-4 h-4 inline mr-2" />
                Sent
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'archived'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Archive className="w-4 h-4 inline mr-2" />
                Archived
              </button>
            </div>

            {/* Search and Filter */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                </select>
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="px-3 py-1.5 btn-primary rounded-lg transition-colors text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">No messages found</p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message);
                      if (!message.isRead) {
                        handleMarkAsRead(message.id);
                      }
                    }}
                    className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50'
                    } ${!message.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-sm ${!message.isRead ? 'font-bold' : 'font-medium'} text-gray-900 dark:text-gray-100`}>
                          {message.sender}
                        </h3>
                        {message.isFlagged && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        {message.priority !== 'normal' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(message.priority)}`}>
                            {message.priority}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(message.timestamp)}</span>
                    </div>
                    <p className={`text-sm ${!message.isRead ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-gray-100 mb-1`}>
                      {message.subject}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{message.preview}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Paperclip className="w-3 h-3 mr-1" />
                        {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Detail */}
          <div className={`${selectedMessage ? 'block' : 'hidden md:block'} flex-1 flex flex-col`}>
            {selectedMessage ? (
              <>
                {/* Message Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="md:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100 dark:hover:text-gray-100 mr-4"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{selectedMessage.subject}</h2>
                        {selectedMessage.priority !== 'normal' && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedMessage.priority)}`}>
                            {selectedMessage.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 space-x-4">
                        <span className="font-medium">{selectedMessage.sender}</span>
                        <span>{selectedMessage.senderEmail}</span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(selectedMessage.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleFlag(selectedMessage.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 transition-colors"
                        title={selectedMessage.isFlagged ? 'Unflag' : 'Flag'}
                      >
                        {selectedMessage.isFlagged ? (
                          <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                        ) : (
                          <StarOff className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedMessage.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                        >
                          <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{attachment.name}</span>
                          <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">({attachment.size})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>

                  {/* Replies */}
                  {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center">
                        <ChevronRight className="w-4 h-4 mr-1" />
                        Replies ({selectedMessage.replies.length})
                      </h3>
                      {selectedMessage.replies.map((reply) => (
                        <div key={reply.id} className="ml-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{reply.sender}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                              {new Date(reply.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Section */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <button className="w-full px-4 py-2 btn-primary rounded-lg transition-colors flex items-center justify-center">
                    <Send className="w-4 h-4 mr-2" />
                    Reply
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
                <div className="text-center">
                  <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a message to read</p>
                  <p className="text-sm mt-2">Choose a message from the list to view its contents</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center">
                <Mail className="w-6 h-6 mr-2 icon-active" />
                New Message
              </h2>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To</label>
                <select
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select recipient...</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.email}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                  placeholder="Enter subject"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  required
                  rows={8}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors flex items-center"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach File
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 btn-primary rounded-lg transition-colors flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
