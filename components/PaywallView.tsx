
import React, { useState } from 'react';
import { redirectToCheckout } from '../services/stripeService';
import { User } from '@supabase/supabase-js';

interface PaywallViewProps {
    onBack: () => void;
    onUpgrade: () => void;
    user: User | null;
}

const FeatureItem: React.FC<{ icon: string; text: React.ReactNode }> = ({ icon, text }) => (
    <li className="flex items-center text-gray-700">
        <i className={`fa-solid ${icon} text-sky-500 w-6 text-center`}></i>
        <span className="ml-3">{text}</span>
    </li>
);

const PaywallView: React.FC<PaywallViewProps> = ({ onBack, onUpgrade, user }) => {
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubscribe = async (plan: 'monthly' | 'annual') => {
        if (!user) {
            setError('Please log in to subscribe');
            return;
        }

        setLoading(plan);
        setError(null);

        try {
            console.log('[PaywallView] Starting checkout for plan:', plan);
            await redirectToCheckout(user.id, plan);
            // Note: redirectToCheckout will redirect the page, so code below won't execute
        } catch (err) {
            console.error('[PaywallView] Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Failed to start checkout. Please try again.');
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="absolute top-6 right-6">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-800 transition-colors">
                    <i className="fa fa-times text-2xl"></i>
                </button>
            </div>

            <div className="w-full max-w-md mx-auto text-center">
                <div className="mb-6">
                     <div className="mx-auto mb-4 bg-sky-100 h-20 w-20 rounded-full flex items-center justify-center ring-8 ring-sky-100/50">
                        <i className="fa-solid fa-rocket text-4xl text-sky-500"></i>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Unlimited Practice for Real-World Success</h1>
                    <p className="text-gray-600">You've used your 3 free practices for the month. Upgrade now for unlimited access!</p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-md p-6 text-left mb-6">
                    <ul className="space-y-4">
                        <FeatureItem icon="fa-infinity" text={<span><span className="font-semibold">Unlimited</span> Practice Sessions</span>} />
                        <FeatureItem icon="fa-clock" text={<span><span className="font-semibold">Full 5-Minute</span> Conversations</span>} />
                        <FeatureItem icon="fa-chart-pie" text={<span><span className="font-semibold">In-Depth</span> Performance Analysis</span>} />
                        <FeatureItem icon="fa-book-open" text={<span>Access <span className="font-semibold">All Resources & Scenarios</span></span>} />
                        <FeatureItem icon="fa-calendar-days" text={<span>Full <span className="font-semibold">Session History</span> & Calendar View</span>} />
                    </ul>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Annual Plan */}
                    <div className="border-2 border-sky-500 bg-sky-50 rounded-2xl p-5 relative">
                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                            Best Value
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Annual Plan</h3>
                                <p className="font-semibold text-green-600 text-sm">Get 2 months free!</p>
                            </div>
                            <div className="text-right">
                                <p className="font-extrabold text-2xl text-gray-900">$99.99</p>
                                <p className="text-gray-600 text-sm">/year</p>
                            </div>
                        </div>
                         <button 
                            onClick={() => handleSubscribe('annual')}
                            disabled={loading !== null}
                            className="mt-4 w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === 'annual' ? 'Processing...' : 'Subscribe Annually'}
                        </button>
                    </div>

                    {/* Monthly Plan */}
                    <div className="border-2 border-gray-300 bg-white rounded-2xl p-5">
                         <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Monthly Plan</h3>
                                <p className="text-gray-600 text-sm">Billed monthly</p>
                            </div>
                            <div className="text-right">
                                <p className="font-extrabold text-2xl text-gray-900">$9.99</p>
                                <p className="text-gray-600 text-sm">/month</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleSubscribe('monthly')}
                            disabled={loading !== null}
                            className="mt-4 w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === 'monthly' ? 'Processing...' : 'Subscribe Monthly'}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-xs text-gray-500">
                    <div className="flex justify-center space-x-4">
                        <a href="#" className="hover:underline">Restore Purchase</a>
                        <a href="#" className="hover:underline">Privacy Policy</a>
                        <a href="#" className="hover:underline">Terms of Service</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaywallView;