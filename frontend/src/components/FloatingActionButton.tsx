import React, { useState } from 'react';
import { Plus, Bot, Megaphone, Workflow, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FloatingActionButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const quickCreateActions = [
    {
      icon: Bot,
      label: 'New Agent',
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => navigate('/dashboard/agents?create=true'),
    },
    {
      icon: Megaphone,
      label: 'New Campaign',
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => navigate('/dashboard/campaigns?create=true'),
    },
    {
      icon: Workflow,
      label: 'New Workflow',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      action: () => navigate('/dashboard/workflows?create=true'),
    },
    {
      icon: FileText,
      label: 'From Template',
      color: 'bg-green-500 hover:bg-green-600',
      action: () => navigate('/dashboard/templates'),
    },
  ];

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Quick Create Menu */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 space-y-3">
          {quickCreateActions.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-end space-x-3 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="bg-gray-900 dark:bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-800 dark:border-gray-700 whitespace-nowrap">
                  {item.label}
                </span>
                <button
                  onClick={() => handleAction(item.action)}
                  className={`${item.color} text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-gray-900 rotate-45'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-2xl hover:scale-110'
        }`}
        title="Quick Create"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Add animation styles */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default FloatingActionButton;
