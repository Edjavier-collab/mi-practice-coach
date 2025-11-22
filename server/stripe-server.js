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
console.log("[DEBUG] SUPABASE_SERVICE_ROLE_KEY after dotenv:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "FOUND" : "NOT FOUND");

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

// Check development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Middleware - CORS configuration
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const getFrontendUrlCandidates = () => {
    const envValue = process.env.FRONTEND_URL;
    if (!envValue) {
        return [];
    }
    return envValue
        .split(',')
        .map(url => url.trim())
        .filter(Boolean);
};

const getRequestBaseUrl = (req) => {
    const origin = req?.headers?.origin;
    if (origin) {
        return origin;
    }

    const envCandidates = getFrontendUrlCandidates();
    if (envCandidates.length > 0) {
        return envCandidates[0];
    }

    return DEFAULT_FRONTEND_URL;
};

const corsOptions = {
    origin: function(origin, callback) {
        const envOrigins = getFrontendUrlCandidates();
        const frontendUrls = envOrigins.length > 0 ? envOrigins : [DEFAULT_FRONTEND_URL];
        
        // Allow requests with no origin (like Stripe webhooks) in production
        if (!origin || frontendUrls.includes(origin) || isDevelopment) {
            callback(null, true);
        } else {
            console.warn('[stripe-server] CORS blocked origin:', origin);
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

// IMPORTANT: Webhook route needs raw body for signature verification
// Define webhook route BEFORE JSON parsing middleware

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
 * Retry logic for Supabase operations
 */
const retrySupabaseOperation = async (operation, maxRetries = 3, initialDelayMs = 100) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries - 1) {
                // Exponential backoff: 100ms, 200ms, 400ms
                const delayMs = initialDelayMs * Math.pow(2, attempt);
                console.warn(`[stripe-server] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    throw lastError;
};

/**
 * Validate Supabase setup
 */
const validateSupabaseSetup = () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const errors = [];
    if (!supabaseUrl) errors.push('VITE_SUPABASE_URL not set');
    if (!supabaseServiceKey) errors.push('SUPABASE_SERVICE_ROLE_KEY not set');
    
    return { isValid: errors.length === 0, errors };
};

/**
 * Update user tier to premium in Supabase
 * This is a reusable function used by both webhook and direct API calls
 */
const updateUserTierToPremium = async (userId) => {
    // Validate Supabase setup
    const setupValidation = validateSupabaseSetup();
    if (!setupValidation.isValid) {
        const errorMsg = `Supabase setup validation failed: ${setupValidation.errors.join(', ')}`;
        console.error('[stripe-server]', errorMsg);
        throw new Error(errorMsg);
    }

    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[stripe-server] Using Supabase Service Role Key for tier update');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    // Update user tier to premium with retry logic
    console.log('[stripe-server] Attempting to update user tier for user:', userId);
    const { data, error: updateError } = await retrySupabaseOperation(async () => {
        return await supabase
            .from('profiles')
            .update({ 
                tier: 'premium',
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select('*');
    });
    
    if (updateError) {
        console.error('[stripe-server] Supabase update error:', updateError);
        console.error('[stripe-server] Error code:', updateError.code);
        console.error('[stripe-server] Error status:', updateError.status);
        console.error('[stripe-server] Error message:', updateError.message);
        throw updateError;
    }
    
    if (!data || data.length === 0) {
        const warningMsg = `No rows updated for user: ${userId}. Possible causes: profile doesn't exist, RLS policies, or invalid service role key.`;
        console.warn('[stripe-server] ⚠️', warningMsg);
        throw new Error(warningMsg);
    } else {
        console.log('[stripe-server] ✅ Successfully updated user tier to premium');
        console.log('[stripe-server] User:', userId);
        console.log('[stripe-server] New tier:', data[0].tier);
        console.log('[stripe-server] Updated at:', data[0].updated_at);
        return data[0];
    }
};

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

        // Update user tier in Supabase using helper function
        try {
            await updateUserTierToPremium(userId);
        } catch (updateError) {
            console.error('[stripe-server] ❌ Failed to update user tier:', updateError.message);
            console.error('[stripe-server] Full error:', {
                message: updateError.message,
                status: updateError.status,
                code: updateError.code,
                details: updateError.details,
            });
            console.error('[stripe-server] TROUBLESHOOTING:');
            console.error('  1. Ensure backend server is running: npm run dev:server');
            console.error('  2. Check Supabase credentials in .env.local');
            console.error('  3. Verify profiles table exists and has correct RLS policies');
            console.error('  4. Check server/stripe-server.js logs for detailed errors');
            // Don't fail the webhook - Stripe will retry
            // In production, you might want to log this to an error tracking service
        }
    }

    res.json({ received: true });
});

/**
 * Setup Verification Endpoint - helps diagnose configuration issues
 * Defined before JSON middleware so it can be accessed early
 */
app.get('/api/setup-check', async (req, res) => {
    console.log('[DEBUG] In setup-check - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'NOT FOUND');
    console.log('[DEBUG] In setup-check - Value length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    const checks = {
        timestamp: new Date().toISOString(),
        environment: isDevelopment ? 'development' : 'production',
        stripe: {
            secretKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
            publishableKeyConfigured: !!process.env.VITE_STRIPE_PUBLISHABLE_KEY,
            priceIds: {
                monthly: PRICE_IDS.monthly.includes('placeholder') ? '❌ NOT SET' : '✅ SET',
                annual: PRICE_IDS.annual.includes('placeholder') ? '❌ NOT SET' : '✅ SET',
            },
            webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        },
        supabase: {
            urlConfigured: !!process.env.VITE_SUPABASE_URL,
            serviceKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        frontend: {
            backendUrlConfigured: !!process.env.FRONTEND_URL,
            backendUrlValue: process.env.FRONTEND_URL || 'Not set (will use default)',
        }
    };

    // Try to connect to Supabase if configured
    if (checks.supabase.urlConfigured && checks.supabase.serviceKeyConfigured) {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.VITE_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                { auth: { autoRefreshToken: false, persistSession: false } }
            );
            
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            
            checks.supabase.connectionTest = error ? `❌ ${error.message}` : `✅ Connected (${count} profiles)`;
        } catch (err) {
            checks.supabase.connectionTest = `❌ ${err.message}`;
        }
    }

    res.json(checks);
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
        const baseUrl = getRequestBaseUrl(req);
        const successUrl = `${baseUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`;
        const cancelUrl = `${baseUrl}`;

        // Create Checkout Session
        const sessionConfig = {
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
            customer_email: req.body.email,
            // Note: customer_creation is not allowed in subscription mode - Stripe creates customer automatically
            billing_address_collection: 'auto', // Auto collect billing address when needed
        };

        // Only enable automatic tax in production if configured
        // In development, disable it to avoid requiring Stripe tax setup
        if (!isDevelopment && process.env.STRIPE_ENABLE_TAX === 'true') {
            sessionConfig.automatic_tax = { enabled: true };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

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
            stack: error.stack,
        });
        
        // Check for common issues
        if (error.type === 'StripeInvalidRequestError') {
            console.error('[stripe-server] Stripe API error - check price IDs and API keys');
        }
        
        res.status(500).json({
            error: error.message || 'Failed to create checkout session',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});

/**
 * Update Tier From Checkout Session
 * This endpoint allows the frontend to directly update the tier after checkout
 * completion, without waiting for webhooks. Useful for development when Stripe CLI isn't running.
 */
app.post('/api/update-tier-from-session', async (req, res) => {
    try {
        console.log('[stripe-server] Received tier update request:', { body: req.body });
        const { sessionId } = req.body;

        if (!sessionId) {
            console.error('[stripe-server] Missing sessionId');
            return res.status(400).json({ error: 'Missing sessionId' });
        }

        // Retrieve the checkout session from Stripe
        console.log('[stripe-server] Retrieving checkout session:', sessionId);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Verify session is completed and paid
        if (session.payment_status !== 'paid') {
            console.error('[stripe-server] Session payment status is not paid:', session.payment_status);
            return res.status(400).json({ 
                error: 'Session payment not completed',
                payment_status: session.payment_status 
            });
        }

        // Extract userId from metadata
        const userId = session.metadata?.userId;
        if (!userId) {
            console.error('[stripe-server] No userId in session metadata');
            return res.status(400).json({ error: 'Missing userId in session metadata' });
        }

        console.log('[stripe-server] Updating tier for user:', userId, 'from session:', sessionId);

        // Update user tier using helper function
        const updatedProfile = await updateUserTierToPremium(userId);

        console.log('[stripe-server] ✅ Tier updated successfully via direct API call');
        res.json({ 
            success: true,
            userId,
            tier: updatedProfile.tier,
            updated_at: updatedProfile.updated_at
        });
    } catch (error) {
        console.error('[stripe-server] Error updating tier from session:', error);
        console.error('[stripe-server] Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
            statusCode: error.statusCode,
        });
        res.status(500).json({
            error: error.message || 'Failed to update tier from session',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});

/**
 * Create Billing Portal Session - allows users to manage their subscription
 */
app.post('/api/create-billing-portal-session', async (req, res) => {
    try {
        console.log('[stripe-server] Received billing portal request:', { body: req.body });
        const { customerId, returnUrl } = req.body;

        if (!customerId) {
            console.error('[stripe-server] Missing customerId');
            return res.status(400).json({ error: 'Missing customerId' });
        }

        const frontendUrl = getRequestBaseUrl(req);
        const portalReturnUrl = returnUrl || `${frontendUrl}`;

        // Create Billing Portal Session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: portalReturnUrl,
        });

        console.log('[stripe-server] Billing portal session created:', session.id, 'for customer:', customerId);
        console.log('[stripe-server] Portal URL:', session.url);

        res.json({
            url: session.url,
        });
    } catch (error) {
        console.error('[stripe-server] Error creating billing portal session:', error);
        console.error('[stripe-server] Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
        });
        res.status(500).json({
            error: error.message || 'Failed to create billing portal session',
        });
    }
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[stripe-server] Server running on port ${PORT}`);
    console.log(`[stripe-server] Webhook endpoint: http://localhost:${PORT}/api/stripe-webhook`);
    console.log(`[stripe-server] Setup check endpoint: http://localhost:${PORT}/api/setup-check`);
});

