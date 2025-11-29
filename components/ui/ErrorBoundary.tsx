import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandler } from '../../utils/errorHandler';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Use standardized error handler for logging
        ErrorHandler.logError(error, {
            action: 'error-boundary',
            level: 'error',
        });
        
        // Log component stack separately
        if (errorInfo.componentStack) {
            ErrorHandler.logError(
                ErrorHandler.createError('Component stack trace', 'COMPONENT_STACK', errorInfo.componentStack),
                { action: 'error-boundary', level: 'debug' }
            );
        }
        
        this.setState({ errorInfo });
        
        // In production, you could send this to an error reporting service
        // Example: logErrorToService(error, errorInfo);
    }

    handleReload = (): void => {
        window.location.reload();
    };

    handleGoHome = (): void => {
        window.location.href = '/';
    };

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div 
                    className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex items-center justify-center p-4"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                        {/* Error Icon */}
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <svg 
                                className="w-8 h-8 text-red-500" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                                />
                            </svg>
                        </div>

                        {/* Error Message */}
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            Oops! Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-6">
                            We're sorry, but something unexpected happened. Don't worry, your data is safe.
                        </p>

                        {/* Error Details (Development only) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                    Technical Details (Development Only)
                                </summary>
                                <div className="mt-2 p-4 bg-gray-100 rounded-lg text-xs font-mono overflow-auto max-h-48">
                                    <p className="text-red-600 font-semibold mb-2">
                                        {this.state.error.name}: {this.state.error.message}
                                    </p>
                                    {this.state.errorInfo && (
                                        <pre className="text-gray-600 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={this.handleRetry}
                                className="w-full bg-sky-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-sky-600 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                                aria-label="Try again"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Try Again
                                </span>
                            </button>
                            
                            <button
                                onClick={this.handleReload}
                                className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                aria-label="Reload the page"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Reload Page
                                </span>
                            </button>
                            
                            <button
                                onClick={this.handleGoHome}
                                className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors focus:outline-none focus:underline"
                                aria-label="Go back to home page"
                            >
                                Return to Home
                            </button>
                        </div>

                        {/* Support Info */}
                        <p className="mt-6 text-xs text-gray-400">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

