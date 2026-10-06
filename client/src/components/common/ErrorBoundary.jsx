import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Enterprise React Error Boundary
 * Prevents app crashes from rendering a white screen. Displays a themed recovery UI.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Application ErrorBoundary caught]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F4] text-[#2E2622] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-8 sm:p-10 shadow-xl text-center space-y-6">
            <div className="w-12 h-12 rounded-[2px] bg-[#F9ECEB] border border-[#A4493D]/30 flex items-center justify-center mx-auto text-[#A4493D]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] font-medium">
                Application Notice
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#2E2622]">
                Something Went Unexpectedly Wrong
              </h1>
              <p className="text-xs text-[#7A726A] leading-relaxed">
                An unexpected interface error occurred. Your session data and shopping cart remain safe.
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="text-left bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] p-3 text-xs text-[#A4493D] font-mono overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[2px] bg-[#3A2F2B] text-[#FAF8F4] font-medium text-xs uppercase tracking-[0.08em] hover:bg-[#2E2622] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] text-[#2E2622] font-medium text-xs uppercase tracking-[0.08em] hover:bg-[#E7E2DA] transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Store</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
