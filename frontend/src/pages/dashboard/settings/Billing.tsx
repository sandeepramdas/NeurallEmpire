import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  CreditCard,
  Download,
  ChevronRight,
  Check,
  Crown,
  Zap,
  Rocket,
  Calendar,
  FileText,
  AlertCircle,
  Heart,
  Gift
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  maxAgents: number;
  maxCampaigns: number;
  storageLimit: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Billing: React.FC = () => {
  const { organization, token } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [contributionAmount, setContributionAmount] = useState<number>(500);
  const [showContribution, setShowContribution] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchInvoices();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/payments/plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      } else {
        console.error('Failed to fetch plans:', data.message || data.error);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/payments/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') {
      alert('You are already on the free plan');
      return;
    }

    if (planId === 'overlord') {
      alert('Please contact sales for custom enterprise pricing');
      return;
    }

    setLoading(true);

    try {
      // Create order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planType: planId.toUpperCase(),
          billingCycle,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Initialize Razorpay checkout
      const options = {
        key: orderData.data.keyId,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'NeurallEmpire',
        description: `${planId.toUpperCase()} Plan - ${billingCycle}`,
        order_id: orderData.data.orderId,
        handler: async function (response: any) {
          // Verify payment
          try {
            const verifyResponse = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planType: planId.toUpperCase(),
                billingCycle,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              alert('Payment successful! Your subscription has been activated.');
              window.location.reload();
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: organization?.name || '',
          email: organization?.billingEmail || '',
        },
        theme: {
          color: '#6366f1',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Zap className="w-8 h-8" />;
      case 'conqueror':
        return <Crown className="w-8 h-8" />;
      case 'emperor':
        return <Rocket className="w-8 h-8" />;
      case 'overlord':
        return <CreditCard className="w-8 h-8" />;
      default:
        return <Zap className="w-8 h-8" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free':
        return 'from-gray-500 to-gray-600';
      case 'conqueror':
        return 'from-blue-500 to-indigo-600';
      case 'emperor':
        return 'from-purple-500 to-pink-600';
      case 'overlord':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const calculateYearlyPrice = (monthlyPrice: number) => {
    return monthlyPrice * 12 * 0.8; // 20% discount
  };

  const handleContribution = async () => {
    if (contributionAmount < 100) {
      alert('Minimum contribution amount is ₹100');
      return;
    }

    setLoading(true);

    try {
      // Create contribution order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planType: 'CONTRIBUTION',
          billingCycle: 'ONETIME',
          amount: contributionAmount * 100, // Convert to paise
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create contribution order');
      }

      // Initialize Razorpay checkout
      const options = {
        key: orderData.data.keyId,
        amount: contributionAmount * 100,
        currency: 'INR',
        name: 'NeurallEmpire',
        description: 'Contribution to NeurallEmpire',
        order_id: orderData.data.orderId,
        handler: async function () {
          alert('Thank you for your contribution! 🙏');
          setShowContribution(false);
          setContributionAmount(500);
          fetchInvoices();
        },
        prefill: {
          name: organization?.name || '',
          email: organization?.billingEmail || '',
        },
        theme: {
          color: '#10b981',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Contribution error:', error);
      alert(error.message || 'Failed to process contribution');
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = organization?.planType?.toLowerCase() || 'free';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
          <Link to="/dashboard" className="hover:text-primary-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/dashboard/settings" className="hover:text-primary-600 transition-colors">
            Settings
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-neutral-900 font-medium">Billing & Subscription</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-neutral-900">
          Billing & Subscription
        </h1>
        <p className="text-neutral-600 mt-2">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="mb-8 card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 rounded-lg bg-gradient-to-br ${getPlanColor(currentPlan)} text-white`}>
                {getPlanIcon(currentPlan)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">
                  {currentPlan.toUpperCase()} Plan
                </h3>
                <p className="text-sm text-neutral-600">
                  {organization?.billingCycle === 'YEARLY' ? 'Billed Yearly' : 'Billed Monthly'}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-600 mb-1">Monthly Limit</div>
            <div className="text-2xl font-bold text-neutral-900">
              {organization?.maxAgents || 5} Agents
            </div>
          </div>
        </div>
      </div>

      {/* Contribute to NeurallEmpire Banner */}
      <div className="mb-8 card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                Support NeurallEmpire
              </h3>
              <p className="text-sm text-neutral-600">
                Love our platform? Contribute any amount to help us grow!
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowContribution(!showContribution)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Gift className="w-5 h-5" />
            Contribute Now
          </button>
        </div>

        {showContribution && (
          <div className="mt-6 pt-6 border-t border-green-200">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Contribution Amount (₹)
              </label>
              <div className="flex gap-3 mb-4">
                {[100, 500, 1000, 2000, 5000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setContributionAmount(amount)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      contributionAmount === amount
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="100"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(Number(e.target.value))}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter custom amount"
                />
                <button
                  onClick={handleContribution}
                  disabled={loading || contributionAmount < 100}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">Minimum contribution: ₹100</p>
            </div>
          </div>
        )}
      </div>

      {/* Billing Cycle Toggle */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <span className={`text-sm font-medium ${billingCycle === 'MONTHLY' ? 'text-neutral-900' : 'text-neutral-500'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            billingCycle === 'YEARLY' ? 'bg-primary-600' : 'bg-neutral-300'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
              billingCycle === 'YEARLY' ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billingCycle === 'YEARLY' ? 'text-neutral-900' : 'text-neutral-500'}`}>
          Yearly
          <span className="ml-2 text-xs text-green-600 font-semibold">(Save 20%)</span>
        </span>
      </div>

      {/* Pricing Plans */}
      <div className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-6">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const displayPrice = billingCycle === 'YEARLY' && plan.price > 0
              ? calculateYearlyPrice(plan.price)
              : plan.price;

            return (
              <div
                key={plan.id}
                className={`card hover:shadow-xl transition-all ${
                  isCurrentPlan ? 'border-primary-500 border-2' : ''
                }`}
              >
                <div className={`p-4 rounded-lg bg-gradient-to-br ${getPlanColor(plan.id)} text-white mb-4`}>
                  {getPlanIcon(plan.id)}
                </div>

                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  {plan.name}
                </h3>

                <div className="mb-4">
                  {plan.price === 0 ? (
                    <div className="text-3xl font-bold text-neutral-900">Free</div>
                  ) : plan.id === 'overlord' ? (
                    <div className="text-3xl font-bold text-neutral-900">Custom</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-neutral-900">
                        ₹{displayPrice}
                      </div>
                      <div className="text-sm text-neutral-500">
                        per {billingCycle === 'YEARLY' ? 'year' : 'month'}
                      </div>
                    </>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-neutral-600">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-neutral-200 text-neutral-600 rounded-lg font-medium cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {plan.id === 'overlord' ? 'Contact Sales' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">Billing History</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View All
          </button>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">
                    Invoice
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 10).map((invoice) => (
                  <tr key={invoice.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-900">
                          {invoice.invoiceNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm text-neutral-600">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-neutral-900">
                        ₹{invoice.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : invoice.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">No billing history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;
