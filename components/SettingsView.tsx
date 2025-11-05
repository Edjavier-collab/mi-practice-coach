import React from 'react';
import { UserTier } from '../types';

interface SettingsViewProps {
    userTier: UserTier;
    onNavigateToPaywall: () => void;
    onLogout: () => void;
}

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase px-4 mb-2">{title}</h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {children}
        </div>
    </div>
);

const SettingsRow: React.FC<{ onClick?: () => void; isLast?: boolean; children: React.ReactNode }> = ({ onClick, isLast = false, children }) => (
    <div
        onClick={onClick}
        className={`flex justify-between items-center p-4 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors ${!isLast ? 'border-b border-gray-200' : ''}`}
    >
        {children}
    </div>
);


const SettingsView: React.FC<SettingsViewProps> = ({ userTier, onNavigateToPaywall, onLogout }) => {
    const handlePlaceholderClick = (feature: string) => {
        alert(`${feature} feature coming soon!`);
    };

    const isPremium = userTier === UserTier.Premium;

    return (
        <div className="flex-grow p-4 sm:p-6 bg-slate-50 min-h-full">
            <header className="text-center mb-8 pt-4">
                <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
            </header>

            <main className="max-w-2xl mx-auto">
                <SettingsSection title="Account">
                    <div onClick={onLogout} className="flex justify-center items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl">
                        <span className="text-red-500 font-medium">Log Out</span>
                    </div>
                </SettingsSection>

                <SettingsSection title="Subscription">
                    {isPremium ? (
                        <>
                            <SettingsRow>
                                <span className="text-gray-800">Current Plan</span>
                                <span className="font-semibold text-gray-800">Premium</span>
                            </SettingsRow>
                            <SettingsRow onClick={() => handlePlaceholderClick('Manage Subscription')}>
                                <span className="text-sky-600">Manage Subscription</span>
                            </SettingsRow>
                            <SettingsRow onClick={() => handlePlaceholderClick('Restore Purchase')} isLast>
                                <span className="text-sky-600">Restore Purchase</span>
                            </SettingsRow>
                        </>
                    ) : (
                        <>
                            <SettingsRow onClick={onNavigateToPaywall}>
                                <div>
                                    <p className="text-gray-800">Current Plan</p>
                                    <p className="text-sky-600 text-sm font-semibold">Free Tier</p>
                                </div>
                                <i className="fa fa-chevron-right text-gray-400"></i>
                            </SettingsRow>
                             <SettingsRow onClick={() => handlePlaceholderClick('Restore Purchase')} isLast>
                                <span className="text-gray-800">Restore Purchase</span>
                                <i className="fa fa-chevron-right text-gray-400"></i>
                            </SettingsRow>
                        </>
                    )}
                </SettingsSection>

                <SettingsSection title="Legal">
                    <SettingsRow onClick={() => handlePlaceholderClick('Privacy Policy')}>
                        <span className="text-gray-800">Privacy Policy</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                    <SettingsRow onClick={() => handlePlaceholderClick('Terms of Service')} isLast>
                        <span className="text-gray-800">Terms of Service</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                </SettingsSection>

                <SettingsSection title="Support">
                    <SettingsRow onClick={() => handlePlaceholderClick('Contact Us / Help Center')} isLast>
                        <span className="text-gray-800">Contact Us / Help Center</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                </SettingsSection>
            </main>
        </div>
    );
};

export default SettingsView;