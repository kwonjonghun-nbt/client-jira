import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <div className="text-red-500 text-4xl">!</div>
          <h2 className="text-lg font-semibold text-gray-800">
            페이지를 표시할 수 없습니다
          </h2>
          <p className="text-sm text-gray-500 text-center max-w-md">
            {this.state.error?.message ?? '알 수 없는 오류가 발생했습니다.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
