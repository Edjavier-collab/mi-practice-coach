import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { SubscriptionDetails, UserTier } from '../../types';
import { getUserSubscription, cancelSubscription, restoreSubscription, createMockSubscription, upgradeToAnnual } from '../../services/stripeService';

interface CancelSubscriptionViewProps {
    user: User;
    userTier: UserTier;
    onBack: () => void;
    onTierUpdated?: () => void;
}

const CancelSubscriptionView: React.FC<CancelSubscriptionViewProps> = ({ user, userTier, onBack, onTierUpdated }) => {
    const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [premiumTierMismatch, setPremiumTierMismatch] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [showCancellationFlow, setShowCancellationFlow] = useState(false);

    useEffect(() => {
        loadSubscription();
    }, [user.id]);

    const loadSubscription = async () => {
        setLoading(true);
        setError(null);
        setPremiumTierMismatch(false);
        try {
            const sub = await getUserSubscription(user.id);
            // Check if this is a premium tier mismatch response
            if (sub && typeof sub === 'object' && '_premiumTierMismatch' in sub) {
                setPremiumTierMismatch(true);
                setError(sub.error);
                setSubscription(null);
                
                // Backend's get-subscription endpoint now automatically recovers subscriptions
                // using the stored plan from the database, so no need to auto-create here
                // The subscription should be recovered on the next page load or refresh
            } else {
                setSubscription(sub);
                // Log subscription details for debugging
                if (sub) {
                    console.log('[CancelSubscriptionView] Subscription loaded:', {
                        plan: sub.plan,
                        originalPrice: sub.originalPrice,
                        currentPrice: sub.currentPrice,
                        periodLabel: sub.plan === 'monthly' ? 'month' : 'year',
                        hasRetentionDiscount: sub.hasRetentionDiscount
                    });
                }
            }
        } catch (err) {
            console.error('[CancelSubscriptionView] Error loading subscription:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription details';
            
            // Check if this is a network/server error with more details
            let displayError = errorMessage;
            if (errorMessage.includes('endpoint not found') || errorMessage.includes('Failed to fetch')) {
                displayError = 'Unable to reach the subscription server. Please ensure `npm run dev:server` is running on port 3001.';
            } else if (errorMessage.includes('Mock subscription')) {
                displayError = errorMessage; // Use the detailed backend error
            }
            
            setError(displayError);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptOffer = async () => {
        setActionLoading('accept');
        setError(null);
        setSuccess(null);
        
        try {
            await cancelSubscription(user.id, true);
            setSuccess('Great! Your 30% discount has been applied. You\'ll continue to enjoy premium features at the discounted rate.');
            // Reload subscription to show updated discount
            await loadSubscription();
            // Refresh tier if callback provided
            if (onTierUpdated) {
                setTimeout(() => onTierUpdated(), 1000);
            }
        } catch (err) {
            console.error('[CancelSubscriptionView] Error accepting offer:', err);
            setError(err instanceof Error ? err.message : 'Failed to apply discount. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You\'ll lose access to premium features at the end of your billing period.')) {
            return;
        }

        setActionLoading('cancel');
        setError(null);
        setSuccess(null);
        
        try {
            const result = await cancelSubscription(user.id, false);
            setSuccess(`Your subscription has been cancelled. You'll continue to have access until ${new Date(result.currentPeriodEnd).toLocaleDateString()}.`);
            // Reload subscription to show cancellation status
            await loadSubscription();
            // Refresh tier if callback provided
            if (onTierUpdated) {
                setTimeout(() => onTierUpdated(), 1000);
            }
        } catch (err) {
            console.error('[CancelSubscriptionView] Error cancelling:', err);
            setError(err instanceof Error ? err.message : 'Failed to cancel subscription. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestore = async () => {
        setActionLoading('restore');
        setError(null);
        setSuccess(null);
        
        try {
            const result = await restoreSubscription(user.id);
            setSuccess('Your subscription has been restored! You\'ll continue to have access to premium features.');
            // Reload subscription to show restored status
            await loadSubscription();
            // Refresh tier if callback provided
            if (onTierUpdated) {
                setTimeout(() => onTierUpdated(), 1000);
            }
        } catch (err) {
            console.error('[CancelSubscriptionView] Error restoring:', err);
            setError(err instanceof Error ? err.message : 'Failed to restore subscription. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpgradeToAnnual = async () => {
        setUpgradeLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const result = await upgradeToAnnual(user.id);
            const message = result?.message || 'Your subscription will be upgraded to Annual at the end of your current billing period.';
            setSuccess(message);
            // Reload subscription to show updated plan
            await loadSubscription();
            // Refresh tier if callback provided
            if (onTierUpdated) {
                setTimeout(() => onTierUpdated(), 1000);
            }
        } catch (err) {
            console.error('[CancelSubscriptionView] Error upgrading:', err);
            setError(err instanceof Error ? err.message : 'Failed to upgrade subscription. Please try again.');
        } finally {
            setUpgradeLoading(false);
        }
    };

    const formatMockCreationError = (err: unknown) => {
        const baseMessage = err instanceof Error ? err.message : 'Failed to create mock subscription';
        if (/Failed to fetch|NetworkError/i.test(baseMessage)) {
            return 'Unable to reach the subscription server. Please ensure `npm run dev:server` is running on port 3001.';
        }
        if (baseMessage.includes('endpoint not found')) {
            return 'Mock subscription endpoint not found. Is `npm run dev:server` running on port 3001?';
        }
        // Return the backend error message as-is for better debugging
        return baseMessage;
    };

    const handleCreateMockSubscription = async () => {
        setLoading(true);
        setError(null);
        
        try {
            await createMockSubscription(user.id, 'monthly');
            await loadSubscription();
        } catch (err) {
            console.error('[CancelSubscriptionView] Error creating mock subscription:', err);
            setError(formatMockCreationError(err));
            setLoading(false);
        }
    };

    const formatPrice = (price: number) => {
        return `$${price.toFixed(2)}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const calculateDiscountedPrice = () => {
        if (!subscription) return null;
        const discountAmount = subscription.originalPrice * 0.3;
        return subscription.originalPrice - discountAmount;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading subscription details...</p>
                </div>
            </div>
        );
    }

    if (error && !subscription) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto text-center">
                    <div className="mb-6">
                        <div className="mx-auto mb-4 bg-red-100 h-20 w-20 rounded-full flex items-center justify-center">
                            <i className="fa-solid fa-exclamation-triangle text-4xl text-red-500"></i>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Subscription</h1>
                        <p className="text-gray-600 mb-4">{error}</p>
                        {error.includes('dev:server') && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                                <p className="text-sm text-yellow-800">
                                    <strong>Development Mode:</strong> Make sure you're running the backend server:
                                </p>
                                <code className="block mt-2 text-xs bg-yellow-100 p-2 rounded">
                                    npm run dev:server
                                </code>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onBack}
                        className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!subscription) {
        // Show special message if user is premium but no subscription found
        if (premiumTierMismatch || userTier === UserTier.Premium) {
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-md mx-auto text-center">
                        <div className="mb-6">
                            <div className="mx-auto mb-4 bg-yellow-100 h-20 w-20 rounded-full flex items-center justify-center">
                                <i className="fa-solid fa-exclamation-triangle text-4xl text-yellow-600"></i>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Not Found</h1>
                            <p className="text-gray-600 mb-4">
                                Your account shows as premium, but no active Stripe subscription was found. 
                                This may happen if your subscription was cancelled or there's a mismatch between 
                                your account status and Stripe records.
                            </p>
                            {error && (
                                <p className="text-sm text-gray-500 mb-4">{error}</p>
                            )}
                            <p className="text-gray-600 mb-4">
                                Please contact support if you believe this is an error, or if you'd like to 
                                reactivate your subscription.
                            </p>
                            <button
                                onClick={handleCreateMockSubscription}
                                className="text-sky-600 hover:text-sky-700 text-sm font-medium underline mb-4"
                            >
                                Fix Subscription (Dev)
                            </button>
                        </div>
                        <button
                            onClick={onBack}
                            className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition"
                        >
                            Go Back to Settings
                        </button>
                    </div>
                </div>
            );
        }
        
        // Regular "no subscription" message for free tier users
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto text-center">
                    <div className="mb-6">
                        <div className="mx-auto mb-4 bg-gray-100 h-20 w-20 rounded-full flex items-center justify-center">
                            <i className="fa-solid fa-info-circle text-4xl text-gray-400"></i>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">No Active Subscription</h1>
                        <p className="text-gray-600">You don't have an active subscription to cancel.</p>
                    </div>
                    <button
                        onClick={onBack}
                        className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const discountedPrice = calculateDiscountedPrice();
    
    // Determine plan type with fallback for 'unknown' plans
    let detectedPlan = subscription.plan;
    if (detectedPlan === 'unknown') {
        // Infer plan from pricing: annual plans are typically > $50
        // This matches the backend fallback logic
        if (subscription.originalPrice > 50) {
            detectedPlan = 'annual';
            console.warn('[CancelSubscriptionView] Plan was "unknown", inferred as "annual" from price:', subscription.originalPrice);
        } else {
            detectedPlan = 'monthly';
            console.warn('[CancelSubscriptionView] Plan was "unknown", inferred as "monthly" from price:', subscription.originalPrice);
        }
    }
    
    const planName = detectedPlan === 'monthly' ? 'Monthly' : 'Annual';
    const periodLabel = detectedPlan === 'monthly' ? 'month' : 'year';
    
    // Validate that pricing matches plan type
    // Annual subscriptions should be significantly higher than monthly
    const isLikelyAnnual = subscription.originalPrice > 50;
    const isLikelyMonthly = subscription.originalPrice <= 50;
    if ((detectedPlan === 'annual' && !isLikelyAnnual) || (detectedPlan === 'monthly' && !isLikelyMonthly)) {
        console.warn('[CancelSubscriptionView] ⚠️ Plan type mismatch detected:', {
            plan: detectedPlan,
            originalPrice: subscription.originalPrice,
            expectedRange: detectedPlan === 'annual' ? '> $50' : '<= $50'
        });
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="absolute top-6 left-6">
                <button
                    onClick={onBack}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                    aria-label="Go back"
                >
                    <i className="fa fa-arrow-left text-2xl" aria-hidden="true"></i>
                </button>
            </div>

            <div className="w-full max-w-md mx-auto">
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 bg-sky-100 h-20 w-20 rounded-full flex items-center justify-center ring-8 ring-sky-100/50">
                        <i className="fa-solid fa-credit-card text-4xl text-sky-500"></i>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                        {showCancellationFlow ? 'Cancel Subscription' : 'Manage Subscription'}
                    </h1>
                    <p className="text-gray-600">
                        {showCancellationFlow ? "We're sorry to see you go" : 'View and manage your subscription details'}
                    </p>
                </div>

                {/* Current Subscription Details */}
                <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Current Subscription</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Plan</span>
                            <span className="font-semibold text-gray-900">{planName} Plan</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Current Price</span>
                            <span className="font-semibold text-gray-900">
                                {formatPrice(subscription.currentPrice)}/{periodLabel}
                                {subscription.hasRetentionDiscount && (
                                    <span className="text-green-600 text-sm ml-2">(30% off)</span>
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Next Billing Date</span>
                            <span className="font-semibold text-gray-900">{formatDate(subscription.currentPeriodEnd)}</span>
                        </div>
                        {subscription.cancelAtPeriodEnd && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                <p className="text-yellow-800 text-sm">
                                    <i className="fa-solid fa-exclamation-triangle mr-2"></i>
                                    Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Retention Offer - Only show when user clicks Cancel */}
                {showCancellationFlow && !subscription.hasRetentionDiscount && !subscription.cancelAtPeriodEnd && (
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-300 rounded-2xl p-6 mb-6">
                        <div className="text-center mb-4">
                            <div className="inline-block bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase mb-2">
                                Special Offer
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Stay with us for 30% off!</h3>
                            <p className="text-gray-700 mb-4">
                                We'd love to keep you as a member. Accept this offer and pay only{' '}
                                <span className="font-bold text-sky-600">{formatPrice(discountedPrice!)}</span> per {periodLabel} instead of{' '}
                                <span className="line-through text-gray-500">{formatPrice(subscription.originalPrice)}</span>.
                            </p>
                            <div className="bg-white rounded-lg p-4 mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Original Price</span>
                                    <span className="text-lg font-bold text-gray-900">{formatPrice(subscription.originalPrice)}/{periodLabel}</span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-gray-600">Your New Price</span>
                                    <span className="text-2xl font-extrabold text-sky-600">{formatPrice(discountedPrice!)}/{periodLabel}</span>
                                </div>
                                <div className="text-center mt-3 text-sm text-gray-600">
                                    Save {formatPrice(subscription.originalPrice - discountedPrice!)} per {periodLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded">
                        <p className="text-green-700">{success}</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                {!subscription.hasRetentionDiscount && !subscription.cancelAtPeriodEnd && (
                    <div className="space-y-4">
                        {!showCancellationFlow ? (
                            // Initial view - Show Upgrade and Cancel buttons
                            <>
                                {/* Upgrade to Annual button - only show for monthly subscribers */}
                                {detectedPlan === 'monthly' && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-4">
                                        <div className="text-center mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 mb-2">Upgrade to Annual</h3>
                                            <p className="text-gray-700 text-sm mb-3">
                                                Save money by switching to annual billing. Your upgrade will take effect at the end of your current billing period.
                                            </p>
                                            <div className="bg-white rounded-lg p-3 mb-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600">Monthly (current)</span>
                                                    <span className="font-semibold text-gray-900">{formatPrice(subscription.originalPrice)}/month</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 text-sm">
                                                    <span className="text-gray-600">Annual (upgrade)</span>
                                                    <span className="font-semibold text-green-600">$99.99/year</span>
                                                </div>
                                                <div className="text-center mt-2 text-xs text-gray-600">
                                                    Save ${(subscription.originalPrice * 12 - 99.99).toFixed(2)} per year
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleUpgradeToAnnual}
                                                disabled={upgradeLoading || actionLoading !== null}
                                                className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {upgradeLoading ? (
                                                    <span><i className="fa fa-spinner fa-spin mr-2"></i>Upgrading...</span>
                                                ) : (
                                                    <span>Upgrade to Annual Plan</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowCancellationFlow(true)}
                                    className="w-full bg-red-500 text-white font-bold py-4 rounded-lg hover:bg-red-600 transition text-lg"
                                >
                                    Cancel Subscription
                                </button>
                                <button
                                    onClick={onBack}
                                    className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                >
                                    Go Back to Settings
                                </button>
                            </>
                        ) : (
                            // Cancellation flow - Show retention offer buttons
                            <>
                                <button
                                    onClick={handleAcceptOffer}
                                    disabled={actionLoading !== null}
                                    className="w-full bg-sky-500 text-white font-bold py-4 rounded-lg hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                                >
                                    {actionLoading === 'accept' ? (
                                        <span><i className="fa fa-spinner fa-spin mr-2"></i>Applying Discount...</span>
                                    ) : (
                                        <span>Keep My Subscription (30% Off)</span>
                                    )}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={actionLoading !== null}
                                    className="w-full bg-gray-200 text-gray-800 font-bold py-4 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {actionLoading === 'cancel' ? (
                                        <span><i className="fa fa-spinner fa-spin mr-2"></i>Cancelling...</span>
                                    ) : (
                                        <span>Cancel Anyway</span>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {subscription.cancelAtPeriodEnd && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-gray-600 mb-4">
                                Your subscription is scheduled to cancel on {formatDate(subscription.currentPeriodEnd)}.
                            </p>
                        </div>
                        <button
                            onClick={handleRestore}
                            disabled={actionLoading !== null}
                            className="w-full bg-green-500 text-white font-bold py-4 rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                            {actionLoading === 'restore' ? (
                                <span><i className="fa fa-spinner fa-spin mr-2"></i>Restoring...</span>
                            ) : (
                                <span><i className="fa-solid fa-rotate-left mr-2"></i>Restore Purchase</span>
                            )}
                        </button>
                        <button
                            onClick={onBack}
                            className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                        >
                            Go Back to Settings
                        </button>
                    </div>
                )}

                {subscription.hasRetentionDiscount && !subscription.cancelAtPeriodEnd && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-gray-600 mb-4">
                                You're already enjoying the 30% discount! Your subscription will continue at the discounted rate.
                            </p>
                        </div>
                        <button
                            onClick={handleCancel}
                            disabled={actionLoading !== null}
                            className="w-full bg-gray-200 text-gray-800 font-bold py-4 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading === 'cancel' ? (
                                <span><i className="fa fa-spinner fa-spin mr-2"></i>Cancelling...</span>
                            ) : (
                                <span>Cancel Subscription</span>
                            )}
                        </button>
                        <button
                            onClick={onBack}
                            className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition"
                        >
                            Go Back to Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CancelSubscriptionView;

