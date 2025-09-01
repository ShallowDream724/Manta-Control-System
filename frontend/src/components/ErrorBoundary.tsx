import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * 错误边界组件
 * 捕获并显示应用程序错误
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
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
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  应用程序错误
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  很抱歉，应用程序遇到了一个错误
                </p>
              </div>

              {this.state.error && (
                <div className="mt-6">
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-red-800 mb-2">
                      错误详情：
                    </h3>
                    <p className="text-sm text-red-700 font-mono">
                      {this.state.error.message}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  重新加载页面
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  返回首页
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-6">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    开发者信息 (点击展开)
                  </summary>
                  <div className="mt-2 bg-gray-100 rounded-md p-4">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {this.state.error?.stack}
                    </pre>
                    <hr className="my-2 border-gray-300" />
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
