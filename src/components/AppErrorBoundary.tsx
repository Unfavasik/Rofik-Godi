import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed:', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-[#D9232D] px-6 text-center text-white">
          <h1 className="text-2xl font-black">Something went wrong</h1>
          <p className="mt-2 text-sm">Please reload the app.</p>
          <button
            type="button"
            onClick={() => window.location.replace('/home')}
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#D9232D]"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
