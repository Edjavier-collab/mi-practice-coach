import React, { useState, useEffect } from 'react';

interface CookiePreferences {
    essential: boolean; // Always true, cannot disable
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
}

interface CookieConsentProps {
    onConsent?: (preferences: CookiePreferences) => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onConsent }) => {
    const [showBanner, setShowBanner] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>({
        essential: true,
        functional: false,
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        // Check if user has already made a choice
        const storedConsent = localStorage.getItem('mi-coach-cookie-consent');
        if (!storedConsent) {
            // No prior consent, show banner
            setShowBanner(true);
        }
    }, []);

    const handleAcceptAll = () => {
        const allConsent: CookiePreferences = {
            essential: true,
            functional: true,
            analytics: true,
            marketing: true,
        };
        saveCookiePreferences(allConsent);
    };

    const handleRejectNonEssential = () => {
        const minimalConsent: CookiePreferences = {
            essential: true,
            functional: false,
            analytics: false,
            marketing: false,
        };
        saveCookiePreferences(minimalConsent);
    };

    const handleCustomize = () => {
        setPreferences({
            ...preferences,
            essential: true, // Essential always true
        });
        setShowDetails(true);
    };

    const handleSavePreferences = () => {
        saveCookiePreferences(preferences);
    };

    const saveCookiePreferences = (prefs: CookiePreferences) => {
        localStorage.setItem('mi-coach-cookie-consent', JSON.stringify(prefs));
        localStorage.setItem('mi-coach-cookie-consent-date', new Date().toISOString());
        setShowBanner(false);
        setShowDetails(false);
        if (onConsent) {
            onConsent(prefs);
        }
        // In production, integrate with analytics/tracking services here
    };

    const handleTogglePreference = (key: keyof CookiePreferences) => {
        if (key === 'essential') {
            // Essential cannot be disabled
            return;
        }
        setPreferences({
            ...preferences,
            [key]: !preferences[key],
        });
    };

    if (!showBanner && !showDetails) {
        return null;
    }

    if (showDetails) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
                <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg p-6 space-y-6 animate-slide-up">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cookie Preferences</h2>
                        <p className="text-gray-600">Manage your cookie and tracking preferences below.</p>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {/* Essential */}
                        <div className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <input
                                type="checkbox"
                                checked={preferences.essential}
                                disabled
                                className="mt-1 mr-4 w-5 h-5 text-sky-600 cursor-not-allowed"
                            />
                            <div className="flex-1">
                                <label className="font-semibold text-gray-900 block">Essential Cookies</label>
                                <p className="text-sm text-gray-600 mt-1">
                                    Required for login, security, and basic functionality. Cannot be disabled.
                                </p>
                            </div>
                        </div>

                        {/* Functional */}
                        <div className="flex items-start p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer"
                             onClick={() => handleTogglePreference('functional')}>
                            <input
                                type="checkbox"
                                checked={preferences.functional}
                                onChange={() => handleTogglePreference('functional')}
                                className="mt-1 mr-4 w-5 h-5 text-sky-600 cursor-pointer"
                            />
                            <div className="flex-1">
                                <label className="font-semibold text-gray-900 block cursor-pointer">Functional Cookies</label>
                                <p className="text-sm text-gray-600 mt-1">
                                    Remember your preferences, language, and settings across sessions.
                                </p>
                            </div>
                        </div>

                        {/* Analytics */}
                        <div className="flex items-start p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer"
                             onClick={() => handleTogglePreference('analytics')}>
                            <input
                                type="checkbox"
                                checked={preferences.analytics}
                                onChange={() => handleTogglePreference('analytics')}
                                className="mt-1 mr-4 w-5 h-5 text-sky-600 cursor-pointer"
                            />
                            <div className="flex-1">
                                <label className="font-semibold text-gray-900 block cursor-pointer">Analytics Cookies</label>
                                <p className="text-sm text-gray-600 mt-1">
                                    Help us understand how you use the app to improve features and performance.
                                </p>
                            </div>
                        </div>

                        {/* Marketing */}
                        <div className="flex items-start p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer"
                             onClick={() => handleTogglePreference('marketing')}>
                            <input
                                type="checkbox"
                                checked={preferences.marketing}
                                onChange={() => handleTogglePreference('marketing')}
                                className="mt-1 mr-4 w-5 h-5 text-sky-600 cursor-pointer"
                            />
                            <div className="flex-1">
                                <label className="font-semibold text-gray-900 block cursor-pointer">Marketing Cookies</label>
                                <p className="text-sm text-gray-600 mt-1">
                                    Track your interests to show relevant content and ads. You can opt-out anytime.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setShowDetails(false)}
                            className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSavePreferences}
                            className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
                        >
                            Save Preferences
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50 p-6 sm:p-8 bottom-20 sm:bottom-24">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Cookie Preferences</h3>
                        <p className="text-gray-600 text-sm">
                            We use cookies to enhance your experience. By continuing, you accept our use of essential cookies. You can customize your preferences anytime.
                        </p>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={handleRejectNonEssential}
                            className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                        >
                            Essential Only
                        </button>
                        <button
                            onClick={handleCustomize}
                            className="px-6 py-2 border border-sky-600 text-sky-600 font-semibold rounded-lg hover:bg-sky-50 transition whitespace-nowrap"
                        >
                            Customize
                        </button>
                        <button
                            onClick={handleAcceptAll}
                            className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition whitespace-nowrap"
                        >
                            Accept All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;

