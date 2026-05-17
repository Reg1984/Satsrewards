import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { logError } from '../lib/errorLogging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log error to our backend
    try {
      logError(error, {
        componentStack: errorInfo.componentStack,
        component: 'ErrorBoundary',
        action: 'componentDidCatch'
      });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
            <p className="text-red-600 mb-4">
              We've encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
            </p>
            <div className="text-left p-4 bg-red-100 rounded-md overflow-auto max-h-[200px] mb-4">
              <p className="text-sm font-mono text-red-800 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}