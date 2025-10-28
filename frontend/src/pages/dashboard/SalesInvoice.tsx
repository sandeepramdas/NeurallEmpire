import React, { useState } from 'react';
import { Receipt, Plus, Search, Filter, Download, Edit, Trash2, Eye, Send, Printer } from 'lucide-react';

const SalesInvoice: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample data - Replace with actual API call
  const salesInvoices = [
    {
      id: 'INV-2025-001',
      customer: 'Acme Corporation',
      orderRef: 'SO-001',
      date: '2025-10-08',
      dueDate: '2025-11-07',
      amount: 15000,
      status: 'Paid',
      paymentMethod: 'Bank Transfer'
    },
    {
      id: 'INV-2025-002',
      customer: 'Tech Solutions Inc',
      orderRef: 'SO-002',
      date: '2025-10-07',
      dueDate: '2025-11-06',
      amount: 28500,
      status: 'Pending',
      paymentMethod: 'Credit Card'
    },
    {
      id: 'INV-2025-003',
      customer: 'Global Enterprises',
      orderRef: 'SO-003',
      date: '2025-10-06',
      dueDate: '2025-11-05',
      amount: 42000,
      status: 'Overdue',
      paymentMethod: 'Wire Transfer'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Receipt className="w-8 h-8 icon-active" />
            Sales Invoices
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Create and manage invoices for your sales orders</p>
        </div>
        <button className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm">
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">248</div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-2">↑ 8% from last month</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Paid</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">$385,200</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">165 invoices</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">$142,500</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">58 invoices</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">$28,300</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">15 invoices</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search invoices by ID, customer name, order reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              style={{ focusRingColor: 'var(--color-primary)' }}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <Filter className="w-5 h-5" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Invoice ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order Ref
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Invoice Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {salesInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium icon-active">
                    {invoice.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {invoice.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {invoice.orderRef}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {invoice.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {invoice.dueDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${invoice.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <button className="icon-active hover:opacity-70 transition-opacity" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="icon-active hover:opacity-70 transition-opacity" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 dark:text-green-400 hover:opacity-70 transition-opacity" title="Send">
                        <Send className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 dark:text-gray-400 hover:opacity-70 transition-opacity" title="Print">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 dark:text-red-400 hover:opacity-70 transition-opacity" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

export default SalesInvoice;
