import React, { useState, useEffect } from 'react';
import { UserTier, View } from '../types';
import { User } from '@supabase/supabase-js';
import { restoreSubscription, getUserSubscription } from '../services/stripeService';
import DevEmailViewer from './DevEmailViewer';

interface SettingsViewProps {
    userTier: UserTier;
    onNavigateToPaywall: () => void;
    onLogout: () => Promise<void>;
    onNavigate: (view: View) => void;
    user: User | null;
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


const SettingsView: React.FC<SettingsViewProps> = ({ userTier, onNavigateToPaywall, onLogout, onNavigate, user }) => {
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'annual' | 'unknown' | null>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [subscriptionCancelled, setSubscriptionCancelled] = useState(false);
    const [hasPremiumMismatch, setHasPremiumMismatch] = useState(false);

    const handlePlaceholderClick = (feature: string) => {
        alert(`${feature} feature coming soon!`);
    };

    // Fetch subscription plan and cancellation status for all users
    useEffect(() => {
        const fetchSubscriptionPlan = async () => {
            if (!user) {
                setSubscriptionPlan(null);
                setSubscriptionCancelled(false);
                setHasPremiumMismatch(false);
                return;
            }

            setSubscriptionLoading(true);
            try {
                const subscription = await getUserSubscription(user.id);
                console.log('[SettingsView] Subscription data received:', subscription);
                
                // Check for premium tier mismatch
                if (subscription && typeof subscription === 'object' && '_premiumTierMismatch' in subscription) {
                    console.log('[SettingsView] Premium tier mismatch detected');
                    setHasPremiumMismatch(true);
                    setSubscriptionCancelled(false);
                    setSubscriptionPlan(null);
                    return;
                }
                
                if (subscription) {
                    // Check if subscription is cancelled AND period hasn't ended
                    const isCancelled = subscription.cancelAtPeriodEnd === true;
                    const currentPeriodEnd = subscription.currentPeriodEnd;
                    const periodHasEnded = currentPeriodEnd ? new Date(currentPeriodEnd) <= new Date() : false;
                    
                    // Only mark as cancelled if subscription exists, is cancelled, and period hasn't ended
                    const cancelled = isCancelled && !periodHasEnded;
                    
                    console.log('[SettingsView] Cancellation check:', {
                        cancelAtPeriodEnd: isCancelled,
                        currentPeriodEnd,
                        periodHasEnded,
                        cancelled
                    });
                    
                    setSubscriptionCancelled(cancelled);
                    setHasPremiumMismatch(false);
                    
                    // Extract plan type from subscription
                    let plan = subscription.plan;
                    console.log('[SettingsView] Plan value from subscription:', plan, 'Type:', typeof plan);
                    console.log('[SettingsView] Cancellation status:', cancelled);
                    
                    // Normalize plan value (handle case sensitivity, whitespace, etc.)
                    if (plan && typeof plan === 'string') {
                        plan = plan.trim().toLowerCase();
                    }
                    
                    // Try to infer from price if plan is missing, null, undefined, or unknown
                    const originalPrice = subscription.originalPrice;
                    const currentPrice = subscription.currentPrice;
                    const price = originalPrice || currentPrice;
                    console.log('[SettingsView] Price values - originalPrice:', originalPrice, 'currentPrice:', currentPrice, 'using:', price);
                    
                    if (plan === 'monthly' || plan === 'annual') {
                        console.log('[SettingsView] ✅ Setting plan to:', plan);
                        setSubscriptionPlan(plan);
                    } else if (!plan || plan === 'unknown' || plan === 'null' || plan === 'undefined') {
                        // Try to infer plan from price if available
                        console.log('[SettingsView] Plan is missing/unknown, attempting to infer from price:', price);
                        
                        if (price && typeof price === 'number') {
                            // Annual plans are typically > $50, monthly < $50
                            // Mock annual: 99.99 (or 69.99 with discount), Mock monthly: 9.99 (or 6.99 with discount)
                            // Check for exact mock prices first, then use threshold
                            if (price === 99.99 || price === 69.99 || price >= 50) {
                                console.log('[SettingsView] ✅ Inferred plan as "annual" from price:', price);
                                setSubscriptionPlan('annual');
                            } else if (price === 9.99 || price === 6.99 || (price > 0 && price < 50)) {
                                console.log('[SettingsView] ✅ Inferred plan as "monthly" from price:', price);
                                setSubscriptionPlan('monthly');
                            } else {
                                console.warn('[SettingsView] ⚠️ Could not infer plan from price, setting to unknown');
                                setSubscriptionPlan('unknown');
                            }
                        } else {
                            console.warn('[SettingsView] ⚠️ Plan is unknown and no price available, setting to unknown');
                            setSubscriptionPlan('unknown');
                        }
                    } else {
                        // Plan has an unexpected value - try price inference as fallback
                        console.warn('[SettingsView] ⚠️ Unexpected plan value:', plan);
                        if (price && typeof price === 'number') {
                            // Check for exact mock prices first, then use threshold
                            if (price === 99.99 || price === 69.99 || price >= 50) {
                                console.log('[SettingsView] ✅ Fallback: Inferred plan as "annual" from price:', price);
                                setSubscriptionPlan('annual');
                            } else if (price === 9.99 || price === 6.99 || (price > 0 && price < 50)) {
                                console.log('[SettingsView] ✅ Fallback: Inferred plan as "monthly" from price:', price);
                                setSubscriptionPlan('monthly');
                            } else {
                                setSubscriptionPlan('unknown');
                            }
                        } else {
                            setSubscriptionPlan('unknown');
                        }
                    }
                } else {
                    // Subscription not found (404) - no restore available
                    console.log('[SettingsView] No subscription found');
                    setHasPremiumMismatch(false);
                    setSubscriptionCancelled(false);
                    setSubscriptionPlan(null);
                }
            } catch (err) {
                console.error('[SettingsView] Error fetching subscription plan:', err);
                // On error, don't set plan (will show just "Premium Member")
                setSubscriptionPlan(null);
                setSubscriptionCancelled(false);
                setHasPremiumMismatch(false);
            } finally {
                setSubscriptionLoading(false);
            }
        };

        fetchSubscriptionPlan();
    }, [user, userTier]);

    const handleRestorePurchase = async () => {
        if (!user) {
            alert('Please log in to restore your purchase');
            return;
        }

        setRestoreLoading(true);
        setRestoreError(null);
        setRestoreSuccess(null);

        try {
            const result = await restoreSubscription(user.id);
            const message = result?.message || 'Your subscription has been restored successfully!';
            setRestoreSuccess(message);
            
            // Reload the page after a short delay to refresh tier and subscription state
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            console.error('[SettingsView] Error restoring purchase:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchase. Please try again.';
            
            // Improve error messages
            let displayError = errorMessage;
            if (errorMessage.includes('endpoint not found') || errorMessage.includes('Failed to fetch')) {
                displayError = 'Unable to reach the subscription server. Please ensure `npm run dev:server` is running on port 3001.';
            } else if (errorMessage.includes('No subscription found')) {
                displayError = 'No subscription found to restore. If you had a subscription, it may have expired or been cancelled.';
            }
            
            setRestoreError(displayError);
        } finally {
            setRestoreLoading(false);
        }
    };

    const handleLogoutClick = async () => {
        if (logoutLoading) return;
        setLogoutError(null);
        setLogoutLoading(true);
        try {
            await onLogout();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to log out. Please try again.';
            setLogoutError(message);
        } finally {
            setLogoutLoading(false);
        }
    };

    const isPremium = userTier === UserTier.Premium;
    const isAnonymous = !user;

    // Get creation date from user metadata or fallback to null
    const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString() : null;

    return (
        <div className="flex-grow p-4 sm:p-6 bg-slate-50 min-h-full">
            <header className="text-center mb-8 pt-4">
                <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
            </header>

            <main className="max-w-2xl mx-auto">
                {user && (
                    <SettingsSection title="Profile">
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-2xl font-bold"
                                    aria-label={`Profile avatar for ${user.email}`}
                                >
                                    {user.email?.charAt(0).toUpperCase() || <i className="fa fa-user" aria-hidden="true"></i>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-gray-900 truncate" title={user.email}>
                                        {user.email}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            isPremium ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                            {isPremium 
                                                ? subscriptionPlan === 'monthly' 
                                                    ? 'Premium - Monthly' 
                                                    : subscriptionPlan === 'annual'
                                                        ? 'Premium - Annual'
                                                        : 'Premium Member'
                                                : 'Free Plan'
                                            }
                                        </span>
                                        {memberSince && (
                                            <span>• Member since {memberSince}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                        <span className="text-gray-500">User ID</span>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 font-mono select-all">
                                                {user.id}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(user.id);
                                                    // Optional: Show small toast
                                                }}
                                                className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Copy ID"
                                                aria-label="Copy user ID to clipboard"
                                            >
                                                <i className="fa fa-copy" aria-hidden="true"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SettingsSection>
                )}

                <SettingsSection title="Account">
                    {isAnonymous ? (
                        <>
                            <SettingsRow onClick={() => onNavigate(View.Login)} isLast>
                                <div>
                                    <span className="text-sky-600 font-medium">Sign In or Create Account</span>
                                    <p className="text-xs text-gray-500 mt-1">Access unlimited sessions and sync across devices</p>
                                </div>
                                <i className="fa fa-chevron-right text-gray-400"></i>
                            </SettingsRow>
                        </>
                    ) : (
                        <div className="p-4">
                            <button
                                type="button"
                                onClick={handleLogoutClick}
                                disabled={logoutLoading}
                                className="w-full flex justify-center items-center rounded-xl border border-red-200 bg-white py-3 text-red-500 font-semibold hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {logoutLoading ? (
                                    <span className="flex items-center text-sm">
                                        <i className="fa fa-spinner fa-spin mr-2"></i>
                                        Logging Out...
                                    </span>
                                ) : (
                                    'Log Out'
                                )}
                            </button>
                            {logoutError && (
                                <p className="mt-2 text-center text-sm text-red-500">{logoutError}</p>
                            )}
                        </div>
                    )}
                </SettingsSection>

                <SettingsSection title="Subscription">
                    {isPremium ? (
                        <>
                            {user && (
                                <SettingsRow>
                                    <div>
                                        <span className="text-gray-800">Current Plan</span>
                                        {subscriptionLoading ? (
                                            <p className="text-sm text-gray-500 mt-1">
                                                <i className="fa fa-spinner fa-spin mr-1"></i>Loading...
                                            </p>
                                        ) : (
                                            <p className="text-sm font-semibold text-gray-800 mt-1">
                                                Premium{subscriptionPlan === 'monthly' ? ' (Monthly)' : subscriptionPlan === 'annual' ? ' (Annual)' : ''}
                                            </p>
                                        )}
                                    </div>
                                </SettingsRow>
                            )}
                            {!user && (
                                <SettingsRow>
                                    <span className="text-gray-800">Current Plan</span>
                                    <span className="font-semibold text-gray-800">Premium</span>
                                </SettingsRow>
                            )}
                            <SettingsRow onClick={() => onNavigate(View.CancelSubscription)}>
                                <span className="text-sky-600">Manage Subscription</span>
                                <i className="fa fa-chevron-right text-gray-400"></i>
                            </SettingsRow>
                            {/* Only show Restore Purchase if subscription exists, is cancelled, and period hasn't ended */}
                            {subscriptionCancelled && (
                                <SettingsRow onClick={handleRestorePurchase} isLast>
                                    <div className="flex-1">
                                        <span className="text-sky-600">Restore Purchase</span>
                                        {restoreLoading && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                <i className="fa fa-spinner fa-spin"></i> Restoring...
                                            </span>
                                        )}
                                        {restoreSuccess && (
                                            <span className="ml-2 text-xs text-green-600">
                                                <i className="fa fa-check"></i> Restored!
                                            </span>
                                        )}
                                        {restoreError && (
                                            <span className="ml-2 text-xs text-red-600">
                                                <i className="fa fa-exclamation-triangle"></i> {restoreError}
                                            </span>
                                        )}
                                    </div>
                                    {!restoreLoading && <i className="fa fa-chevron-right text-gray-400"></i>}
                                </SettingsRow>
                            )}
                        </>
                    ) : (
                        <>
                            <SettingsRow onClick={onNavigateToPaywall} isLast={!subscriptionCancelled}>
                                <div>
                                    <p className="text-gray-800">Current Plan</p>
                                    <p className="text-sky-600 text-sm font-semibold">Free Tier</p>
                                </div>
                                {user ? (
                                    <button className="px-4 py-1.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition shadow-sm">
                                        Upgrade
                                    </button>
                                ) : (
                                    <i className="fa fa-chevron-right text-gray-400"></i>
                                )}
                            </SettingsRow>
                            {/* Free tier users can restore if a cancelled subscription still exists */}
                            {subscriptionCancelled && (
                                <SettingsRow onClick={handleRestorePurchase} isLast>
                                    <div className="flex-1">
                                        <span className="text-sky-600">Restore Purchase</span>
                                        {restoreLoading && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                <i className="fa fa-spinner fa-spin"></i> Restoring...
                                            </span>
                                        )}
                                        {restoreSuccess && (
                                            <span className="ml-2 text-xs text-green-600">
                                                <i className="fa fa-check"></i> Restored!
                                            </span>
                                        )}
                                        {restoreError && (
                                            <span className="ml-2 text-xs text-red-600">
                                                <i className="fa fa-exclamation-triangle"></i> {restoreError}
                                            </span>
                                        )}
                                    </div>
                                    {!restoreLoading && <i className="fa fa-chevron-right text-gray-400"></i>}
                                </SettingsRow>
                            )}
                        </>
                    )}
                </SettingsSection>

                <SettingsSection title="Legal">
                    <SettingsRow onClick={() => onNavigate(View.PrivacyPolicy)}>
                        <span className="text-gray-800">Privacy Policy</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                    <SettingsRow onClick={() => onNavigate(View.TermsOfService)}>
                        <span className="text-gray-800">Terms of Service</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                    <SettingsRow onClick={() => onNavigate(View.SubscriptionTerms)}>
                        <span className="text-gray-800">Subscription & Billing</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                    <SettingsRow onClick={() => onNavigate(View.CookiePolicy)}>
                        <span className="text-gray-800">Cookie Policy</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                    <SettingsRow onClick={() => onNavigate(View.Disclaimer)} isLast>
                        <span className="text-gray-800">Medical & Education Disclaimer</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                </SettingsSection>

                <SettingsSection title="Support">
                    <SettingsRow onClick={() => onNavigate(View.Support)} isLast>
                        <span className="text-gray-800">Contact Us / Help Center</span>
                        <i className="fa fa-chevron-right text-gray-400"></i>
                    </SettingsRow>
                </SettingsSection>

                <DevEmailViewer />
            </main>
        </div>
    );
};

export default SettingsView;