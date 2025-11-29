import { loadStripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment
const getStripePublishableKey = (): string => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
        throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
    }
    return key;
};

// Initialize Stripe
let stripePromise: Promise<any> | null = null;
const getStripe = () => {
    if (!stripePromise) {
        stripePromise = loadStripe(getStripePublishableKey());
    }
    return stripePromise;
};

/**
 * Get and validate backend URL from environment
 * Detects malformed URLs (e.g., starting with '.' or ':') and falls back to default
 * Logs a warning if a malformed URL is detected
 */
const getBackendUrl = (): string => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    const defaultUrl = 'http://localhost:3001';
    
    // If no env var is set, use default
    if (!envUrl) {
        return defaultUrl;
    }
    
    // Check if URL is malformed (starts with '.' or ':' without protocol)
    const isMalformed = envUrl.startsWith('.') || 
                       (envUrl.startsWith(':') && !envUrl.startsWith('://')) ||
                       (!envUrl.startsWith('http://') && !envUrl.startsWith('https://'));
    
    if (isMalformed) {
        console.warn(
            `[stripeService] Invalid VITE_BACKEND_URL detected: "${envUrl}". ` +
            `Expected a full URL (e.g., "http://localhost:3001"). ` +
            `Falling back to default: "${defaultUrl}"`
        );
        return defaultUrl;
    }
    
    return envUrl;
};

/**
 * Create a Stripe Checkout Session via backend API
 * This calls a backend endpoint that creates the checkout session securely
 */
export const createCheckoutSession = async (
    userId: string,
    plan: 'monthly' | 'annual'
): Promise<{ sessionId: string; url: string }> => {
    // Backend URL - defaults to localhost:3001 for development
    // In production, set VITE_BACKEND_URL to your deployed server URL
    const backendUrl = getBackendUrl();
    
    const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId,
            plan,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create checkout session' }));
        const errorMessage = errorData.error || errorData.message || 'Failed to create checkout session';
        throw new Error(errorMessage);
    }

    return await response.json();
};

/**
 * Redirect user to Stripe Checkout
 */
export const redirectToCheckout = async (userId: string, plan: 'monthly' | 'annual'): Promise<void> => {
    try {
        console.log('[stripeService] Creating checkout session for user:', userId, 'plan:', plan);
        
        const { sessionId, url } = await createCheckoutSession(userId, plan);
        
        if (url) {
            // Redirect to Stripe Checkout
            window.location.href = url;
        } else {
            // Fallback: use Stripe.js redirect
            const stripe = await getStripe();
            const { error } = await stripe!.redirectToCheckout({ sessionId });
            
            if (error) {
                throw new Error(error.message || 'Failed to redirect to checkout');
            }
        }
    } catch (error) {
        console.error('[stripeService] Checkout error:', error);
        throw error;
    }
};

/**
 * Get user's subscription details
 * Returns null if no subscription is found (404), throws error for other failures
 */
export const getUserSubscription = async (userId: string): Promise<any | null> => {
    const backendUrl = getBackendUrl();
    
    const response = await fetch(`${backendUrl}/api/get-subscription?userId=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        // Handle 404 (no subscription found)
        if (response.status === 404) {
            // Check if the response includes premium tier info
            const errorData = await response.json().catch(() => ({}));
            if (errorData.hasPremiumTier) {
                // Return a special object to indicate premium tier mismatch
                return { _premiumTierMismatch: true, error: errorData.error || 'No subscription found' };
            }
            return null;
        }
        
        // For other errors, parse and throw with proper error message
        const errorData = await response.json().catch(() => ({ error: 'Failed to get subscription' }));
        const errorMessage = errorData.error || errorData.message || 'Failed to get subscription';
        throw new Error(errorMessage);
    }

    return await response.json();
};

/**
 * Cancel subscription with retention offer option
 */
export const cancelSubscription = async (userId: string, acceptOffer: boolean): Promise<any> => {
    const backendUrl = getBackendUrl();
    
    const response = await fetch(`${backendUrl}/api/cancel-subscription`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId,
            action: acceptOffer ? 'accept_offer' : 'cancel',
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to cancel subscription' }));
        const errorMessage = errorData.error || errorData.message || 'Failed to cancel subscription';
        throw new Error(errorMessage);
    }

    return await response.json();
};

/**
 * Apply retention discount to subscription
 */
export const applyRetentionDiscount = async (userId: string): Promise<any> => {
    const backendUrl = getBackendUrl();
    
    const response = await fetch(`${backendUrl}/api/apply-retention-discount`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to apply retention discount' }));
        const errorMessage = errorData.error || errorData.message || 'Failed to apply retention discount';
        throw new Error(errorMessage);
    }

    return await response.json();
};

/**
 * Restore a cancelled subscription
 */
export const restoreSubscription = async (userId: string): Promise<any> => {
    const backendUrl = getBackendUrl();
    
    const response = await fetch(`${backendUrl}/api/restore-subscription`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to restore subscription' }));
        const errorMessage = errorData.error || errorData.message || 'Failed to restore subscription';
        throw new Error(errorMessage);
    }

    return await response.json();
};

/**
 * Upgrade subscription from monthly to annual
 */
export const upgradeToAnnual = async (userId: string): Promise<any> => {
    const backendUrl = getBackendUrl();
    
    const response = await fetch(`${backendUrl}/api/upgrade-subscription`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to upgrade subscription' }));
        const errorMessage = errorData.error || errorData.message || 'Failed to upgrade subscription';
        throw new Error(errorMessage);
    }

    return await response.json();
};

/**
 * Create a mock subscription (development only)
 */
export const createMockSubscription = async (userId: string, plan: 'monthly' | 'annual'): Promise<any> => {
    const backendUrl = getBackendUrl();

    let response: Response;
    try {
        response = await fetch(`${backendUrl}/api/create-mock-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                plan,
            }),
        });
    } catch (networkError) {
        console.error('[stripeService] createMockSubscription network error:', networkError);
        throw new Error('Unable to reach the subscription server. Please run `npm run dev:server` (default http://localhost:3001).');
    }

    if (!response.ok) {
        let errorMessage = `Failed to create mock subscription (HTTP ${response.status})`;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const errorData = await response.json().catch(() => ({}));
            errorMessage = errorData.error || errorData.message || errorMessage;
        } else if (response.status === 404) {
            errorMessage = 'Mock subscription endpoint not found. Is `npm run dev:server` running on port 3001?';
        }

        throw new Error(errorMessage);
    }

    return await response.json();
};

