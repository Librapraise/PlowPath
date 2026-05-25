import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside PlowPath Dashboard:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a] text-slate-100 p-6 font-sans relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-red-500/[0.04] blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-brand-500/[0.04] blur-[120px] pointer-events-none"></div>

          {/* Error Card */}
          <div className="max-w-md w-full glass-card rounded-2xl p-8 shadow-2xl text-center space-y-6 gradient-border animate-scale-up relative z-10">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 animate-pulse ring-4 ring-red-500/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                An unexpected error occurred in the PlowPath dashboard. Our operations monitoring team has been notified.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950/80 border border-slate-800/60 rounded-xl p-4 font-mono text-xs text-red-400/80 overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-brand-500/20 btn-press ring-1 ring-white/10"
              >
                Reload Dashboard
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold rounded-xl text-sm border border-slate-700/50 transition-all btn-press"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
