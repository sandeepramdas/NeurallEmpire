import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  change?: {
    value: number;
    label?: string;
  };
  subtitle?: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary-600 dark:text-primary-400',
  iconBgColor = 'bg-primary-100 dark:bg-primary-900/30',
  change,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`card hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>

          {change && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${change.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change.value >= 0 ? '+' : ''}{change.value}%
              </span>
              {change.label && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{change.label}</span>
              )}
            </div>
          )}

          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>
          )}
        </div>

        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
