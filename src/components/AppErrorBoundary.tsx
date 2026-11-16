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
        <div className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-[#6B352A] px-6 text-center text-[#FFFCF4]">
          <h1 className="text-2xl font-black">Something went wrong</h1>
          <p className="mt-2 text-sm text-[#FFF8D6]">Please reload the app.</p>
          <button
            type="button"
            onClick={() => window.location.replace('/home')}
            className="mt-6 rounded-xl bg-[#FFF1A6] px-5 py-3 text-sm font-extrabold text-[#6B352A] hover:bg-[#FFE980] transition-colors cursor-pointer"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
