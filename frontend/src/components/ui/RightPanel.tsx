import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: '40%' | '50%' | '60%' | '70%' | '80%' | '90%';
  showCloseButton?: boolean;
}

/**
 * RightPanel Component
 * A sliding panel that appears from the right side of the screen
 *
 * @param isOpen - Controls panel visibility
 * @param onClose - Callback when panel should close
 * @param title - Panel header title
 * @param children - Panel content
 * @param width - Panel width (default: 60%)
 * @param showCloseButton - Show close button in header (default: true)
 */
export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '60%',
  showCloseButton = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2
            id="panel-title"
            className="text-xl font-semibold text-gray-900"
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default RightPanel;
