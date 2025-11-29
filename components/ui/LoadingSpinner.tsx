import React from 'react';

interface LoadingSpinnerProps {
    /** Size of the spinner */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Optional loading message */
    message?: string;
    /** Whether to show as full screen overlay */
    fullScreen?: boolean;
    /** Optional className for additional styling */
    className?: string;
}

/**
 * Loading Spinner Component
 * 
 * A beautiful, accessible loading spinner with optional message.
 * 
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" message="Loading your session..." />
 * <LoadingSpinner fullScreen message="Please wait..." />
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message,
    fullScreen = false,
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-14 h-14',
        xl: 'w-20 h-20'
    };

    const textSizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
    };

    const spinnerContent = (
        <div 
            className={`flex flex-col items-center justify-center gap-4 ${className}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            {/* Spinner Animation */}
            <div className="relative">
                {/* Outer ring */}
                <div 
                    className={`${sizeClasses[size]} rounded-full border-4 border-sky-100`}
                    aria-hidden="true"
                />
                
                {/* Spinning ring */}
                <div 
                    className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-4 border-transparent border-t-sky-500 animate-spin`}
                    aria-hidden="true"
                />
                
                {/* Inner pulse */}
                <div 
                    className={`absolute inset-0 flex items-center justify-center`}
                    aria-hidden="true"
                >
                    <div className={`w-2 h-2 rounded-full bg-sky-500 animate-pulse-soft`} />
                </div>
            </div>
            
            {/* Loading Message */}
            {message && (
                <p className={`${textSizeClasses[size]} text-gray-600 font-medium text-center`}>
                    {message}
                </p>
            )}
            
            {/* Screen reader text */}
            <span className="sr-only">
                {message || 'Loading...'}
            </span>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
                {spinnerContent}
            </div>
        );
    }

    return spinnerContent;
};

/**
 * Skeleton Loading Component
 * 
 * Shows a placeholder animation while content is loading.
 * 
 * @example
 * <SkeletonLoader lines={3} />
 * <SkeletonLoader type="card" />
 */
interface SkeletonLoaderProps {
    /** Type of skeleton to show */
    type?: 'text' | 'card' | 'avatar' | 'button';
    /** Number of lines (for text type) */
    lines?: number;
    /** Width of the skeleton */
    width?: string;
    /** Height of the skeleton */
    height?: string;
    /** Optional className */
    className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    type = 'text',
    lines = 1,
    width,
    height,
    className = ''
}) => {
    const baseClasses = 'skeleton rounded animate-pulse bg-gray-200';

    switch (type) {
        case 'avatar':
            return (
                <div 
                    className={`${baseClasses} rounded-full ${className}`}
                    style={{ width: width || '48px', height: height || '48px' }}
                    role="presentation"
                    aria-hidden="true"
                />
            );
        
        case 'card':
            return (
                <div 
                    className={`${baseClasses} rounded-xl ${className}`}
                    style={{ width: width || '100%', height: height || '120px' }}
                    role="presentation"
                    aria-hidden="true"
                />
            );
        
        case 'button':
            return (
                <div 
                    className={`${baseClasses} rounded-lg ${className}`}
                    style={{ width: width || '100px', height: height || '40px' }}
                    role="presentation"
                    aria-hidden="true"
                />
            );
        
        case 'text':
        default:
            return (
                <div className={`space-y-2 ${className}`} role="presentation" aria-hidden="true">
                    {Array.from({ length: lines }).map((_, index) => (
                        <div 
                            key={index}
                            className={`${baseClasses} h-4`}
                            style={{ 
                                width: width || (index === lines - 1 ? '70%' : '100%'),
                                height: height || '16px'
                            }}
                        />
                    ))}
                </div>
            );
    }
};

/**
 * Full Page Loading Component
 * 
 * Shows while the app is initializing.
 */
export const PageLoader: React.FC<{ message?: string }> = ({ 
    message = 'Loading MI Practice Coach...' 
}) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <div className="mb-8 animate-pulse-soft">
                <div className="w-20 h-20 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg 
                        className="w-12 h-12 text-white" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path 
                            d="M21 15C21 16.6569 21 17.4853 20.7397 18.1408C20.5097 18.7212 20.1212 19.2314 19.6166 19.6166C18.9663 20.1212 18.1783 20.3542 16.6023 20.8199L16.2 20.94C15.4 21.18 15 21.3 14.64 21.516C14.3215 21.7046 14.032 21.9366 13.78 22.206C13.21 22.82 12.82 23.58 12 23.58C11.18 23.58 10.79 22.82 10.22 22.206C9.96803 21.9366 9.67848 21.7046 9.36 21.516C9 21.3 8.6 21.18 7.8 20.94L7.39772 20.8199C5.82169 20.3542 5.03367 20.1212 4.38343 19.6166C3.87884 19.2314 3.49033 18.7212 3.26034 18.1408C3 17.4853 3 16.6569 3 15V9C3 7.34315 3 6.51472 3.26034 5.85922C3.49033 5.27879 3.87884 4.76863 4.38343 4.38343C5.03367 3.87884 5.8217 3.64583 7.39772 3.18015L7.8 3.06C8.6 2.82 9 2.7 9.36 2.484C9.67848 2.29544 9.96803 2.06338 10.22 1.794C10.79 1.18 11.18 0.42 12 0.42C12.82 0.42 13.21 1.18 13.78 1.794C14.032 2.06338 14.3215 2.29544 14.64 2.484C15 2.7 15.4 2.82 16.2 3.06L16.6023 3.18015C18.1783 3.64583 18.9663 3.87884 19.6166 4.38343C20.1212 4.76863 20.5097 5.27879 20.7397 5.85922C21 6.51472 21 7.34315 21 9V15Z" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>

            {/* Loading Spinner */}
            <LoadingSpinner size="lg" message={message} />

            {/* Tip */}
            <p className="mt-8 text-sm text-gray-400 text-center max-w-xs">
                Preparing your personalized practice experience...
            </p>
        </div>
    );
};

export default LoadingSpinner;

