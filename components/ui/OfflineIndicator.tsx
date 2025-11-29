import React, { useState, useEffect, useCallback } from 'react';

interface OfflineIndicatorProps {
    /** Optional custom message when offline */
    offlineMessage?: string;
    /** Optional custom message when back online */
    onlineMessage?: string;
    /** Duration (ms) to show the "back online" message */
    onlineDuration?: number;
}

/**
 * Offline Indicator Component
 * 
 * Displays a banner when the user loses internet connectivity
 * and shows a brief "back online" message when connectivity is restored.
 * 
 * @example
 * <OfflineIndicator />
 */
const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
    offlineMessage = "You're offline. Some features may be unavailable.",
    onlineMessage = "You're back online!",
    onlineDuration = 3000
}) => {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [showOnlineMessage, setShowOnlineMessage] = useState<boolean>(false);
    const [wasOffline, setWasOffline] = useState<boolean>(false);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        if (wasOffline) {
            setShowOnlineMessage(true);
            // Hide the online message after specified duration
            setTimeout(() => {
                setShowOnlineMessage(false);
            }, onlineDuration);
        }
    }, [wasOffline, onlineDuration]);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setWasOffline(true);
        setShowOnlineMessage(false);
    }, []);

    useEffect(() => {
        // Check initial state
        if (typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);

    // Don't render anything if online and not showing the "back online" message
    if (isOnline && !showOnlineMessage) {
        return null;
    }

    return (
        <div
            role="alert"
            aria-live="polite"
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
                isOnline ? 'translate-y-0' : 'translate-y-0'
            }`}
        >
            {!isOnline && (
                <div className="bg-amber-500 text-white px-4 py-3 shadow-lg">
                    <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
                        {/* Offline Icon */}
                        <svg 
                            className="w-5 h-5 flex-shrink-0" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" 
                            />
                        </svg>
                        
                        {/* Message */}
                        <span className="text-sm font-medium">
                            {offlineMessage}
                        </span>
                        
                        {/* Optional: Retry button */}
                        <button
                            onClick={() => window.location.reload()}
                            className="ml-4 px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded-md text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-500"
                            aria-label="Retry connection"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}
            
            {showOnlineMessage && (
                <div className="bg-green-500 text-white px-4 py-3 shadow-lg animate-slide-fade-in">
                    <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
                        {/* Online Icon */}
                        <svg 
                            className="w-5 h-5 flex-shrink-0" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" 
                            />
                        </svg>
                        
                        {/* Message */}
                        <span className="text-sm font-medium">
                            {onlineMessage}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineIndicator;

