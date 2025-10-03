import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { CreditCard, TrendingUp, Download, Calendar, Check, Crown, Zap, Rocket } from 'lucide-react';

interface Plan {
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    users: number;
    storage: string;
    apiCalls: string;
  };
  popular?: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl: string;
}

const BillingSubscription: React.FC = () => {
  const { organization } = useAuthStore();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  const plans: Plan[] = [
    {
      name: 'FREE',
      price: 0,
      interval: billingInterval,
      features: [
        'Up to 3 team members',
        '5GB storage',
        '1,000 API calls/month',
        'Basic analytics',
        'Community support',
      ],
      limits: {
        users: 3,
        storage: '5GB',
        apiCalls: '1,000/month',
      },
    },
    {
      name: 'CONQUEROR',
      price: billingInterval === 'month' ? 29 : 290,
      interval: billingInterval,
      features: [
        'Up to 10 team members',
        '50GB storage',
        '50,000 API calls/month',
        'Advanced analytics',
        'Email support',
        'Custom integrations',
      ],
      limits: {
        users: 10,
        storage: '50GB',
        apiCalls: '50,000/month',
      },
    },
    {
      name: 'EMPEROR',
      price: billingInterval === 'month' ? 99 : 990,
      interval: billingInterval,
      features: [
        'Up to 50 team members',
        '500GB storage',
        '500,000 API calls/month',
        'Premium analytics',
        'Priority support',
        'Advanced integrations',
        'Custom workflows',
        'SLA guarantee',
      ],
      limits: {
        users: 50,
        storage: '500GB',
        apiCalls: '500,000/month',
      },
      popular: true,
    },
    {
      name: 'OVERLORD',
      price: billingInterval === 'month' ? 299 : 2990,
      interval: billingInterval,
      features: [
        'Unlimited team members',
        'Unlimited storage',
        'Unlimited API calls',
        'Enterprise analytics',
        '24/7 dedicated support',
        'White-label options',
        'Custom contracts',
        'On-premise deployment',
      ],
      limits: {
        users: 999999,
        storage: 'Unlimited',
        apiCalls: 'Unlimited',
      },
    },
  ];

  // Mock current usage data
  const currentUsage = {
    users: 5,
    storage: 23.5, // GB
    apiCalls: 12500,
  };

  // Mock billing history
  const invoices: Invoice[] = [
    {
      id: 'INV-2025-001',
      date: '2025-10-01',
      amount: 99.0,
      status: 'paid',
      invoiceUrl: '#',
    },
    {
      id: 'INV-2025-002',
      date: '2025-09-01',
      amount: 99.0,
      status: 'paid',
      invoiceUrl: '#',
    },
    {
      id: 'INV-2025-003',
      date: '2025-08-01',
      amount: 99.0,
      status: 'paid',
      invoiceUrl: '#',
    },
  ];

  const currentPlan = plans.find((p) => p.name === (organization?.planType || 'FREE'));

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'FREE':
        return <Zap className="w-6 h-6" />;
      case 'CONQUEROR':
        return <TrendingUp className="w-6 h-6" />;
      case 'EMPEROR':
        return <Rocket className="w-6 h-6" />;
      case 'OVERLORD':
        return <Crown className="w-6 h-6" />;
      default:
        return <Zap className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'FREE':
        return 'from-gray-500 to-gray-600';
      case 'CONQUEROR':
        return 'from-purple-500 to-purple-600';
      case 'EMPEROR':
        return 'from-blue-500 to-blue-600';
      case 'OVERLORD':
        return 'from-yellow-500 to-yellow-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const handleUpgrade = (plan: Plan) => {
    console.log('Upgrading to:', plan.name);
    // Add upgrade logic
  };

  const handleDowngrade = (plan: Plan) => {
    if (window.confirm(`Are you sure you want to downgrade to ${plan.name}?`)) {
      console.log('Downgrading to:', plan.name);
      // Add downgrade logic
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">Manage your subscription plan and billing information</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${getPlanColor(currentPlan?.name || 'FREE')} rounded-lg flex items-center justify-center text-white`}>
              {getPlanIcon(currentPlan?.name || 'FREE')}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{currentPlan?.name} Plan</h2>
              <p className="text-gray-500">
                ${currentPlan?.price}/{currentPlan?.interval}
                {currentPlan?.price === 0 ? '' : ' - Billed monthly'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Next billing date</p>
            <p className="text-lg font-semibold text-gray-900">November 4, 2025</p>
          </div>
        </div>

        {/* Usage Meters */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Team Members</span>
              <span className="text-sm text-gray-500">
                {currentUsage.users} / {currentPlan?.limits.users} used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${getUsagePercentage(currentUsage.users, currentPlan?.limits.users || 1)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Storage</span>
              <span className="text-sm text-gray-500">
                {currentUsage.storage}GB / {currentPlan?.limits.storage} used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${getUsagePercentage(currentUsage.storage, parseFloat(currentPlan?.limits.storage || '1'))}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">API Calls (Monthly)</span>
              <span className="text-sm text-gray-500">
                {currentUsage.apiCalls.toLocaleString()} / {currentPlan?.limits.apiCalls} used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{
                  width: `${getUsagePercentage(currentUsage.apiCalls, parseInt(currentPlan?.limits.apiCalls.replace(/[^0-9]/g, '') || '1'))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'year' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs text-green-600 font-semibold">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plan Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
              plan.name === currentPlan?.name
                ? 'border-indigo-600 shadow-lg'
                : plan.popular
                ? 'border-purple-300'
                : 'border-gray-200 hover:border-indigo-300'
            } relative overflow-hidden`}
          >
            {plan.popular && (
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-1 text-xs font-semibold">
                MOST POPULAR
              </div>
            )}
            {plan.name === currentPlan?.name && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-1 text-xs font-semibold">
                CURRENT PLAN
              </div>
            )}

            <div className="p-6">
              <div className={`w-12 h-12 bg-gradient-to-br ${getPlanColor(plan.name)} rounded-lg flex items-center justify-center text-white mb-4`}>
                {getPlanIcon(plan.name)}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500">/{plan.interval}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.name === currentPlan?.name ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan.price > (currentPlan?.price || 0) ? (
                <button
                  onClick={() => handleUpgrade(plan)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Upgrade
                </button>
              ) : (
                <button
                  onClick={() => handleDowngrade(plan)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Downgrade
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment Method
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Visa ending in 4242</p>
              <p className="text-xs text-gray-500">Expires 12/2026</p>
            </div>
          </div>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Update
          </button>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Billing History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${invoice.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {invoice.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 transition-colors flex items-center justify-end w-full">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingSubscription;
