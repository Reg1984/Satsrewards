import React, { ReactNode } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface StatusCardProps {
  title: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatusCard({ title, status, message, details, icon, className }: StatusCardProps) {
  const getStatusColors = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'loading':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    if (icon) return icon;
    
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />;
      case 'loading':
        return <RefreshCw className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-lg border flex items-start ${getStatusColors()} ${className}`}>
      {getStatusIcon()}
      <div className="ml-3">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm">{message}</p>
        {details && <p className="mt-2 text-xs opacity-80">{details}</p>}
      </div>
    </div>
  );
}