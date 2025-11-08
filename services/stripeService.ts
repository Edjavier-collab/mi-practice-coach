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
 * Create a Stripe Checkout Session via backend API
 * This calls a backend endpoint that creates the checkout session securely
 */
export const createCheckoutSession = async (
    userId: string,
    plan: 'monthly' | 'annual'
): Promise<{ sessionId: string; url: string }> => {
    // Backend URL - defaults to localhost:3001 for development
    // In production, set VITE_BACKEND_URL to your deployed server URL
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
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
        const error = await response.json().catch(() => ({ message: 'Failed to create checkout session' }));
        throw new Error(error.message || 'Failed to create checkout session');
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

