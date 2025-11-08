import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe-server] ERROR: STRIPE_SECRET_KEY not found in environment variables');
    process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
});

// Middleware
app.use(cors());

// IMPORTANT: Webhook route needs raw body for signature verification
// Define webhook route BEFORE JSON parsing middleware
const isDevelopment = process.env.NODE_ENV !== 'production';

// Price IDs - Replace these with your actual Stripe Price IDs after creating products
const PRICE_IDS = {
    monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_placeholder',
    annual: process.env.STRIPE_PRICE_ANNUAL || 'price_annual_placeholder',
};

// Log configuration on startup
console.log('[stripe-server] Configuration:');
console.log('[stripe-server]   - Monthly Price ID:', PRICE_IDS.monthly);
console.log('[stripe-server]   - Annual Price ID:', PRICE_IDS.annual);
console.log('[stripe-server]   - Stripe Secret Key:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'NOT SET');

/**
 * Stripe Webhook Handler - MUST be defined BEFORE JSON parsing middleware
 * This endpoint receives events from Stripe when payments are completed
 */
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // In development with Stripe CLI, signature verification can be skipped
    // Stripe CLI already verifies signatures
    if (isDevelopment && !webhookSecret) {
        console.warn('[stripe-server] Development mode: Parsing webhook without signature verification');
        try {
            event = JSON.parse(req.body.toString());
        } catch (err) {
            console.error('[stripe-server] Failed to parse webhook body:', err);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    } else {
        if (!webhookSecret) {
            console.error('[stripe-server] STRIPE_WEBHOOK_SECRET not set');
            return res.status(500).send('Webhook secret not configured');
        }

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('[stripe-server] Webhook signature verification failed:', err.message);
            console.error('[stripe-server] This might be OK in development with Stripe CLI');
            // In development, try to parse anyway
            if (isDevelopment) {
                try {
                    event = JSON.parse(req.body.toString());
                    console.log('[stripe-server] Development mode: Parsed webhook without signature verification');
                } catch (parseErr) {
                    return res.status(400).send(`Webhook Error: ${err.message}`);
                }
            } else {
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }
        }
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata?.userId;

        if (!userId) {
            console.error('[stripe-server] No userId in session metadata');
            return res.status(400).json({ error: 'Missing userId in metadata' });
        }

        console.log('[stripe-server] Checkout completed for user:', userId);

        // Update user tier in Supabase
        try {
            const { createClient } = await import('@supabase/supabase-js');
            
            const supabaseUrl = process.env.VITE_SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseUrl || !supabaseServiceKey) {
                const errorMsg = `Supabase credentials not configured. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local`;
                console.error('[stripe-server]', errorMsg);
                throw new Error(errorMsg);
            }
            
            console.log('[stripe-server] Using Supabase Service Role Key for tier update');
            
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            
            // Update user tier to premium
            console.log('[stripe-server] Updating user tier in Supabase for user:', userId);
            const { data, error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    tier: 'premium',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select('*');
            
            if (updateError) {
                console.error('[stripe-server] Supabase update error:', updateError);
                throw updateError;
            }
            
            if (!data || data.length === 0) {
                console.warn('[stripe-server] No rows updated. User profile may not exist for user:', userId);
                console.warn('[stripe-server] You may need to create the profile or check RLS policies');
            } else {
                console.log('[stripe-server] Successfully updated user tier to premium for:', userId);
                console.log('[stripe-server] Updated row:', data[0]);
            }
        } catch (updateError) {
            console.error('[stripe-server] Failed to update user tier:', updateError);
            console.error('[stripe-server] Error details:', {
                message: updateError.message,
                status: updateError.status,
                details: updateError.details,
            });
            // Don't fail the webhook - Stripe will retry
            // In production, you might want to log this to an error tracking service
        }
    }

    res.json({ received: true });
});

// Now apply JSON parsing middleware for all other routes
app.use(express.json());

/**
 * Create Stripe Checkout Session
 */
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        console.log('[stripe-server] Received checkout request:', { body: req.body });
        const { userId, plan } = req.body;

        if (!userId || !plan) {
            console.error('[stripe-server] Missing userId or plan:', { userId, plan });
            return res.status(400).json({ error: 'Missing userId or plan' });
        }

        if (!['monthly', 'annual'].includes(plan)) {
            console.error('[stripe-server] Invalid plan:', plan);
            return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "annual"' });
        }

        const priceId = PRICE_IDS[plan];
        if (!priceId || priceId.includes('placeholder')) {
            const errorMsg = `Price ID not configured for plan: ${plan}. Please set STRIPE_PRICE_${plan.toUpperCase()} in .env.local`;
            console.error('[stripe-server]', errorMsg);
            return res.status(500).json({ error: errorMsg });
        }
        
        console.log('[stripe-server] Creating checkout session with price ID:', priceId);

        // Determine success and cancel URLs
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const successUrl = `${baseUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`;
        const cancelUrl = `${baseUrl}`;

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                plan,
                tier: 'premium',
            },
            customer_email: req.body.email, // Optional: if you want to pre-fill email
        });

        console.log('[stripe-server] Checkout session created:', session.id, 'for user:', userId);
        console.log('[stripe-server] Checkout URL:', session.url);

        res.json({
            sessionId: session.id,
            url: session.url,
        });
    } catch (error) {
        console.error('[stripe-server] Error creating checkout session:', error);
        console.error('[stripe-server] Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
            statusCode: error.statusCode,
        });
        res.status(500).json({
            error: error.message || 'Failed to create checkout session',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});


app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`[stripe-server] Server running on port ${PORT}`);
    console.log(`[stripe-server] Webhook endpoint: http://localhost:${PORT}/api/stripe-webhook`);
});

