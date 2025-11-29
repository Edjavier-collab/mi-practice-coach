import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendPurchaseConfirmationEmail, getDevEmails, clearDevEmails } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
console.log("[DEBUG] SUPABASE_SERVICE_ROLE_KEY after dotenv:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "FOUND" : "NOT FOUND");

const app = express();
const PORT = process.env.PORT || 3001;


// Check development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Check if mock subscriptions should be used
const USE_MOCK_SUBSCRIPTIONS = process.env.USE_MOCK_SUBSCRIPTIONS === 'true' || isDevelopment;

// Log mock mode status on startup
console.log('[stripe-server] Mock subscription mode:', USE_MOCK_SUBSCRIPTIONS ? 'ENABLED' : 'DISABLED');
console.log('[stripe-server] isDevelopment:', isDevelopment);
console.log('[stripe-server] USE_MOCK_SUBSCRIPTIONS env:', process.env.USE_MOCK_SUBSCRIPTIONS);

// Initialize Stripe only if we have credentials and are not in pure mock mode
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia',
    });
    console.log('[stripe-server] Stripe initialized with API key');
} else if (USE_MOCK_SUBSCRIPTIONS) {
    console.log('[stripe-server] Stripe not initialized - running in mock mode without credentials');
} else {
    console.error('[stripe-server] ERROR: STRIPE_SECRET_KEY not found and mock mode is disabled');
    process.exit(1);
}

// Helper to check if Stripe is available
const isStripeAvailable = () => stripe !== null;

// Mock subscription service (loaded dynamically)
let mockSubscriptionService = null;

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
    console.log('[stripe-server] getRequestBaseUrl - origin:', origin);

    if (origin && origin.trim()) {
        return origin;
    }

    const envCandidates = getFrontendUrlCandidates();
    console.log('[stripe-server] getRequestBaseUrl - envCandidates:', envCandidates);

    if (envCandidates.length > 0 && envCandidates[0]) {
        return envCandidates[0];
    }

    // Always return the default as a guaranteed fallback
    console.log('[stripe-server] getRequestBaseUrl - using default:', DEFAULT_FRONTEND_URL);
    return DEFAULT_FRONTEND_URL || 'http://localhost:3000';
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

// Security middleware - Helmet for HTTP security headers
app.use(helmet({
    // Configure Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://js.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://generativelanguage.googleapis.com",
                "https://api.stripe.com",
                isDevelopment ? "http://localhost:*" : ""
            ].filter(Boolean),
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: isDevelopment ? null : []
        }
    },
    // Enable cross-origin isolation for better security
    crossOriginEmbedderPolicy: false, // Disabled to allow third-party resources
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Other security headers
    hsts: !isDevelopment, // Only enable HSTS in production
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Rate limiting configuration
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        // Skip rate limiting for webhook endpoints (Stripe needs to send multiple webhooks)
        return req.path === '/api/stripe-webhook';
    }
});

// Stricter rate limit for authentication-related endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 requests per hour for sensitive operations
    message: { error: 'Too many attempts, please try again after an hour.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Apply stricter rate limiting to sensitive endpoints
app.use('/api/create-checkout-session', authLimiter);
// Note: cancel-subscription uses general limiter (100 req/15min) instead of strict authLimiter
// to allow users to easily cancel their subscription without hitting rate limits

// Request logging middleware (for debugging)
if (isDevelopment) {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.path}`);
        next();
    });
}

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

const safeUpdateUserTier = async (userId, tier, context = 'tier-update') => {
    const setupValidation = validateSupabaseSetup();
    if (!setupValidation.isValid) {
        console.warn(`[stripe-server] [${context}] Supabase not configured (${setupValidation.errors.join(', ')}) - skipping tier update`);
        return;
    }

    try {
        await updateUserTier(userId, tier);
    } catch (tierError) {
        console.error(`[stripe-server] [${context}] Failed to update tier:`, tierError);
    }
};

/**
 * Update user tier in Supabase
 */
const updateUserTier = async (userId, tier) => {
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    console.log('[stripe-server] Attempting to update user tier for user:', userId, 'to:', tier);
    const { data, error: updateError } = await retrySupabaseOperation(async () => {
        return await supabase
            .from('profiles')
            .update({ 
                tier,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select('*');
    });
    
    if (updateError) {
        console.error('[stripe-server] Supabase update error:', updateError);
        throw updateError;
    }
    
    if (!data || data.length === 0) {
        const warningMsg = `No rows updated for user: ${userId}`;
        console.warn('[stripe-server] ⚠️', warningMsg);
        throw new Error(warningMsg);
    } else {
        console.log('[stripe-server] ✅ Successfully updated user tier to', tier);
        return data[0];
    }
};

/**
 * Get user email from Supabase auth
 */
const getUserEmail = async (userId) => {
    const setupValidation = validateSupabaseSetup();
    if (!setupValidation.isValid) {
        throw new Error(`Supabase setup validation failed: ${setupValidation.errors.join(', ')}`);
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) {
        throw new Error(`Failed to get user email: ${error?.message || 'No email found'}`);
    }
    
    return data.user.email;
};

/**
 * Update user tier to premium in Supabase
 * This is a reusable function used by both webhook and direct API calls
 */
const updateUserTierToPremium = async (userId) => {
    return await updateUserTier(userId, 'premium');
};

/**
 * Update user subscription plan in Supabase
 * @param {string} userId - User ID
 * @param {string} plan - Plan type ('monthly' or 'annual')
 */
const updateUserPlan = async (userId, plan) => {
    // Validate Supabase setup
    const setupValidation = validateSupabaseSetup();
    if (!setupValidation.isValid) {
        const errorMsg = `Supabase setup validation failed: ${setupValidation.errors.join(', ')}`;
        console.warn('[stripe-server] [updateUserPlan]', errorMsg, '- skipping plan update');
        return;
    }

    if (!['monthly', 'annual'].includes(plan)) {
        console.warn('[stripe-server] [updateUserPlan] Invalid plan:', plan, '- skipping update');
        return;
    }

    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    console.log('[stripe-server] [updateUserPlan] Updating subscription plan for user:', userId, 'to:', plan);
    try {
        const { data, error: updateError } = await retrySupabaseOperation(async () => {
            return await supabase
                .from('profiles')
                .update({ 
                    subscription_plan: plan,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select('*');
        });
        
        if (updateError) {
            // Check if error is due to missing column
            if (updateError.message && (updateError.message.includes('column') || updateError.message.includes('does not exist'))) {
                console.warn('[stripe-server] [updateUserPlan] subscription_plan column does not exist yet - migration may not have been run. Skipping plan update.');
                return null;
            }
            console.error('[stripe-server] [updateUserPlan] Supabase update error:', updateError);
            throw updateError;
        }
        
        if (!data || data.length === 0) {
            console.warn('[stripe-server] [updateUserPlan] ⚠️ No rows updated for user:', userId);
        } else {
            console.log('[stripe-server] [updateUserPlan] ✅ Successfully updated subscription plan to', plan);
            return data[0];
        }
    } catch (err) {
        // Handle any unexpected errors (e.g., column doesn't exist)
        if (err.message && (err.message.includes('column') || err.message.includes('does not exist'))) {
            console.warn('[stripe-server] [updateUserPlan] subscription_plan column does not exist yet - migration may not have been run. Skipping plan update.');
            return null;
        }
        throw err;
    }
};

/**
 * Get user subscription plan from Supabase
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} - Plan type ('monthly' or 'annual') or null
 */
const getUserPlan = async (userId) => {
    const setupValidation = validateSupabaseSetup();
    if (!setupValidation.isValid) {
        console.warn('[stripe-server] [getUserPlan] Supabase not configured - cannot retrieve plan');
        return null;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('subscription_plan')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            // Check if error is due to missing column (column doesn't exist yet)
            if (error.message && (error.message.includes('column') || error.message.includes('does not exist'))) {
                console.warn('[stripe-server] [getUserPlan] subscription_plan column does not exist yet - migration may not have been run');
                return null;
            }
            console.warn('[stripe-server] [getUserPlan] Error retrieving plan:', error.message);
            return null;
        }
        
        return data?.subscription_plan || null;
    } catch (err) {
        // Handle any unexpected errors (e.g., column doesn't exist)
        if (err.message && (err.message.includes('column') || err.message.includes('does not exist'))) {
            console.warn('[stripe-server] [getUserPlan] subscription_plan column does not exist yet - migration may not have been run');
            return null;
        }
        console.warn('[stripe-server] [getUserPlan] Unexpected error:', err.message);
        return null;
    }
};

/**
 * Determine the correct user tier based on subscription status
 * @param {Object} subscription - Stripe subscription object
 * @returns {string} - 'premium' or 'free'
 */
const getSubscriptionTierStatus = (subscription) => {
    if (!subscription) {
        return 'free';
    }

    // Active subscription = premium
    if (subscription.status === 'active') {
        return 'premium';
    }

    // Trialing subscription = premium
    if (subscription.status === 'trialing') {
        return 'premium';
    }

    // Past due but still in grace period = premium (let them keep access)
    if (subscription.status === 'past_due') {
        return 'premium';
    }

    // Cancelled, incomplete, or unpaid = free
    return 'free';
};

/**
 * Update user tier based on subscription status
 * This is a reusable function for all webhook handlers
 * @param {string} userId - User ID
 * @param {Object} subscription - Stripe subscription object or mock subscription
 * @param {string} context - Context string for logging (e.g., 'subscription.deleted')
 */
const updateUserTierFromSubscription = async (userId, subscription, context = 'webhook') => {
    const targetTier = getSubscriptionTierStatus(subscription);

    console.log(`[stripe-server] [${context}] Updating tier for user ${userId} to ${targetTier} based on subscription status: ${subscription?.status || 'none'}`);

    await safeUpdateUserTier(userId, targetTier, context);
};

/**
 * Stripe Webhook Handler - MUST be defined BEFORE JSON parsing middleware
 * This endpoint receives events from Stripe when payments are completed
 */
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // Check if Stripe is available
    if (!isStripeAvailable()) {
        console.warn('[stripe-server] Webhook received but Stripe is not initialized (mock mode)');
        return res.status(200).json({ received: true, message: 'Webhook received in mock mode - no action taken' });
    }

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
    console.log(`[stripe-server] [webhook] Received event: ${event.type}`);

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.metadata?.userId;

            if (!userId) {
                console.error('[stripe-server] [checkout.session.completed] No userId in session metadata');
                return res.status(400).json({ error: 'Missing userId in metadata' });
            }

            console.log('[stripe-server] [checkout.session.completed] Checkout completed for user:', userId);
            const plan = session.metadata?.plan || 'monthly';
            console.log('[stripe-server] [checkout.session.completed] Plan from session metadata:', plan);

            // Update subscription metadata with plan information (if subscription exists)
            // This ensures the plan is stored on the subscription for future retrieval
            if (session.subscription) {
                try {
                    await stripe.subscriptions.update(session.subscription, {
                        metadata: {
                            userId: userId,
                            plan: plan,
                            tier: 'premium',
                        }
                    });
                    console.log('[stripe-server] [checkout.session.completed] ✅ Updated subscription metadata with plan:', plan);
                } catch (metadataError) {
                    console.warn('[stripe-server] [checkout.session.completed] ⚠️ Could not update subscription metadata:', metadataError.message);
                    // Don't fail the webhook - continue with tier update
                }
            }

            // Update user tier and plan in Supabase using helper functions
            try {
                await updateUserTier(userId, 'premium');
                console.log('[stripe-server] [checkout.session.completed] ✅ Successfully updated user to premium tier');
                
                // Save subscription plan to profiles table
                try {
                    await updateUserPlan(userId, plan);
                    console.log('[stripe-server] [checkout.session.completed] ✅ Successfully saved subscription plan:', plan);
                } catch (planError) {
                    console.error('[stripe-server] [checkout.session.completed] ⚠️ Failed to save subscription plan:', planError.message);
                    // Don't fail the webhook if plan save fails - tier update is more important
                }
                
                // Send purchase confirmation email
                try {
                    const userEmail = await getUserEmail(userId);
                    
                    // Get subscription details if available
                    let subscriptionDetails = null;
                    if (session.subscription) {
                        try {
                            const subscription = await stripe.subscriptions.retrieve(session.subscription);
                            subscriptionDetails = {
                                currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                            };
                        } catch (subError) {
                            console.warn('[stripe-server] Could not retrieve subscription details for email:', subError.message);
                        }
                    }
                    
                    const emailResult = await sendPurchaseConfirmationEmail(userEmail, plan, subscriptionDetails);
                    if (emailResult.success) {
                        console.log('[stripe-server] [checkout.session.completed] ✅ Purchase confirmation email sent to:', userEmail);
                    } else {
                        console.warn('[stripe-server] [checkout.session.completed] ⚠️  Email not sent:', emailResult.message);
                    }
                } catch (emailError) {
                    console.error('[stripe-server] [checkout.session.completed] ⚠️  Failed to send purchase confirmation email:', emailError.message);
                    // Don't fail the webhook if email fails - tier update is more important
                }
            } catch (updateError) {
                console.error('[stripe-server] [checkout.session.completed] ❌ Failed to update user tier:', updateError.message);
                console.error('[stripe-server] [checkout.session.completed] Full error:', {
                    message: updateError.message,
                    status: updateError.status,
                    code: updateError.code,
                    details: updateError.details,
                });
                console.error('[stripe-server] [checkout.session.completed] TROUBLESHOOTING:');
                console.error('  1. Ensure backend server is running: npm run dev:server');
                console.error('  2. Check Supabase credentials in .env.local');
                console.error('  3. Verify profiles table exists and has correct RLS policies');
                console.error('  4. Check server/stripe-server.js logs for detailed errors');
                // Don't fail the webhook - Stripe will retry
                // In production, you might want to log this to an error tracking service
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const userId = subscription.metadata?.userId;

            if (!userId) {
                console.warn('[stripe-server] [customer.subscription.deleted] No userId in subscription metadata, cannot update tier');
                // Still return 200 to acknowledge receipt
                break;
            }

            console.log('[stripe-server] [customer.subscription.deleted] Subscription deleted for user:', userId);
            console.log('[stripe-server] [customer.subscription.deleted] Subscription ID:', subscription.id);
            console.log('[stripe-server] [customer.subscription.deleted] Status:', subscription.status);

            try {
                // Update tier to free since subscription is deleted
                await updateUserTierFromSubscription(userId, subscription, 'customer.subscription.deleted');
                console.log('[stripe-server] [customer.subscription.deleted] ✅ Successfully downgraded user to free tier');
            } catch (updateError) {
                console.error('[stripe-server] [customer.subscription.deleted] ❌ Failed to update user tier:', updateError.message);
                // Don't fail the webhook - Stripe will retry
            }
            break;
        }

        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            const userId = subscription.metadata?.userId;

            if (!userId) {
                console.warn('[stripe-server] [customer.subscription.updated] No userId in subscription metadata, cannot update tier');
                // Still return 200 to acknowledge receipt
                break;
            }

            console.log('[stripe-server] [customer.subscription.updated] Subscription updated for user:', userId);
            console.log('[stripe-server] [customer.subscription.updated] Subscription ID:', subscription.id);
            console.log('[stripe-server] [customer.subscription.updated] Status:', subscription.status);
            console.log('[stripe-server] [customer.subscription.updated] Cancel at period end:', subscription.cancel_at_period_end);

            // Log what changed
            if (subscription.cancel_at_period_end) {
                console.log('[stripe-server] [customer.subscription.updated] 🔔 Subscription marked for cancellation at period end:', new Date(subscription.current_period_end * 1000).toISOString());
            }

            // Check if subscription was reactivated
            const previousAttributes = event.data.previous_attributes;
            if (previousAttributes?.cancel_at_period_end === true && subscription.cancel_at_period_end === false) {
                console.log('[stripe-server] [customer.subscription.updated] 🔔 Subscription reactivated (cancel_at_period_end removed)');
            }

            // Check for plan changes
            if (previousAttributes?.items) {
                console.log('[stripe-server] [customer.subscription.updated] 🔔 Subscription plan changed');
            }

            // Update tier based on current subscription status
            try {
                await updateUserTierFromSubscription(userId, subscription, 'customer.subscription.updated');
                console.log('[stripe-server] [customer.subscription.updated] ✅ Successfully updated user tier based on subscription status');
            } catch (updateError) {
                console.error('[stripe-server] [customer.subscription.updated] ❌ Failed to update user tier:', updateError.message);
                // Don't fail the webhook - Stripe will retry
            }
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            const subscriptionId = invoice.subscription;

            console.log('[stripe-server] [invoice.payment_failed] ❌ Payment failed for customer:', customerId);
            console.log('[stripe-server] [invoice.payment_failed] Invoice ID:', invoice.id);
            console.log('[stripe-server] [invoice.payment_failed] Subscription ID:', subscriptionId);
            console.log('[stripe-server] [invoice.payment_failed] Amount due:', invoice.amount_due / 100);
            console.log('[stripe-server] [invoice.payment_failed] Attempt count:', invoice.attempt_count);

            // Note: We don't immediately downgrade the tier here
            // Stripe will continue to retry the payment
            // The subscription status will change to 'past_due'
            // We handle tier changes in customer.subscription.updated or customer.subscription.deleted

            // Future enhancement: Send notification email to user
            console.log('[stripe-server] [invoice.payment_failed] ℹ️ User will retain premium access until subscription status changes');
            break;
        }

        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            const subscriptionId = invoice.subscription;

            console.log('[stripe-server] [invoice.payment_succeeded] ✅ Payment succeeded for customer:', customerId);
            console.log('[stripe-server] [invoice.payment_succeeded] Invoice ID:', invoice.id);
            console.log('[stripe-server] [invoice.payment_succeeded] Subscription ID:', subscriptionId);
            console.log('[stripe-server] [invoice.payment_succeeded] Amount paid:', invoice.amount_paid / 100);
            console.log('[stripe-server] [invoice.payment_succeeded] Billing reason:', invoice.billing_reason);

            // If this is a subscription renewal, the subscription should already be active
            // We can use this event for analytics/logging purposes
            if (invoice.billing_reason === 'subscription_cycle') {
                console.log('[stripe-server] [invoice.payment_succeeded] 🔄 Subscription renewal successful');
            } else if (invoice.billing_reason === 'subscription_create') {
                console.log('[stripe-server] [invoice.payment_succeeded] 🆕 Initial subscription payment successful');
            }

            // Optionally: Retrieve subscription and confirm tier is premium
            if (subscriptionId) {
                try {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const userId = subscription.metadata?.userId;

                    if (userId) {
                        await updateUserTierFromSubscription(userId, subscription, 'invoice.payment_succeeded');
                        console.log('[stripe-server] [invoice.payment_succeeded] ✅ Confirmed user tier is up-to-date');
                    }
                } catch (error) {
                    console.error('[stripe-server] [invoice.payment_succeeded] ⚠️ Could not retrieve subscription to confirm tier:', error.message);
                    // Don't fail the webhook
                }
            }
            break;
        }

        default:
            console.log('[stripe-server] [webhook] Unhandled event type:', event.type);
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
        email: {
            resendConfigured: !!process.env.RESEND_API_KEY,
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            edgeFunctionConfigured: !!process.env.SUPABASE_EDGE_FUNCTION_URL,
            skipSend: process.env.EMAIL_SKIP_SEND === 'true',
            fromEmail: process.env.EMAIL_FROM || 'Not configured',
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
        
        // Check if Stripe is available
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY or use mock subscriptions in development mode.',
                mockMode: USE_MOCK_SUBSCRIPTIONS
            });
        }

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
        
        // Check if Stripe is available
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured. Cannot retrieve checkout session.',
                mockMode: USE_MOCK_SUBSCRIPTIONS
            });
        }

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

        // Get plan from session metadata
        const plan = session.metadata?.plan || 'monthly';
        console.log('[stripe-server] Updating tier for user:', userId, 'from session:', sessionId, 'plan:', plan);

        // Update user tier using helper function
        const updatedProfile = await updateUserTier(userId, 'premium');

        // Save subscription plan to profiles table
        try {
            await updateUserPlan(userId, plan);
            console.log('[stripe-server] ✅ Successfully saved subscription plan:', plan);
        } catch (planError) {
            console.error('[stripe-server] ⚠️ Failed to save subscription plan:', planError.message);
            // Don't fail the request if plan save fails
        }

        // Create mock subscription with correct plan (for mock mode)
        if (USE_MOCK_SUBSCRIPTIONS) {
            try {
                const mockSubscriptionService = await import('./mockSubscriptionService.js');
                mockSubscriptionService.createMockSubscription(userId, plan);
                console.log('[stripe-server] ✅ Created mock subscription with plan:', plan);
            } catch (mockError) {
                console.warn('[stripe-server] ⚠️ Failed to create mock subscription:', mockError.message);
            }
        }

        console.log('[stripe-server] ✅ Tier updated successfully via direct API call');
        res.json({
            success: true,
            userId,
            tier: updatedProfile.tier,
            plan: plan,
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
        
        // Check if Stripe is available
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured. Billing portal is not available in mock mode.',
                mockMode: USE_MOCK_SUBSCRIPTIONS
            });
        }

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
 * Get user's subscription details
 */
app.get('/api/get-subscription', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        console.log('[stripe-server] [get-subscription] Getting subscription for user:', userId);
        console.log('[stripe-server] [get-subscription] USE_MOCK_SUBSCRIPTIONS:', USE_MOCK_SUBSCRIPTIONS);

        // Check mock subscriptions first if enabled
        if (USE_MOCK_SUBSCRIPTIONS) {
            console.log('[stripe-server] [get-subscription] Mock mode enabled, checking mock service...');
            // Lazy load mock service
            if (!mockSubscriptionService) {
                try {
                    console.log('[stripe-server] [get-subscription] Loading mock subscription service...');
                    const mockServiceModule = await import('./mockSubscriptionService.js');
                    mockSubscriptionService = mockServiceModule;
                    console.log('[stripe-server] [get-subscription] Mock subscription service loaded successfully');
                } catch (error) {
                    console.error('[stripe-server] [get-subscription] Failed to load mock subscription service:', error.message);
                    console.error('[stripe-server] [get-subscription] Error stack:', error.stack);
                }
            }
            
            if (mockSubscriptionService) {
                console.log('[stripe-server] [get-subscription] Checking for mock subscription for user:', userId);
                const mockSub = mockSubscriptionService.getMockSubscription(userId);
                if (mockSub) {
                    console.log('[stripe-server] [get-subscription] Found mock subscription for user:', userId);
                    console.log('[stripe-server] [get-subscription] Subscription details:', {
                        subscriptionId: mockSub.subscriptionId,
                        customerId: mockSub.customerId,
                        plan: mockSub.plan,
                        status: mockSub.status,
                        cancelAtPeriodEnd: mockSub.cancelAtPeriodEnd,
                        hasRetentionDiscount: mockSub.hasRetentionDiscount
                    });
                    return res.json(mockSub);
                } else {
                    console.log('[stripe-server] [get-subscription] No mock subscription found for user:', userId);
                    console.log('[stripe-server] [get-subscription] Attempting to recover from Supabase...');
                    // In mock mode, check if user is premium and try to recover subscription
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseUrl = process.env.VITE_SUPABASE_URL;
                    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                    console.log('[stripe-server] [get-subscription] Supabase URL:', supabaseUrl ? 'SET' : 'MISSING');
                    console.log('[stripe-server] [get-subscription] Supabase service key:', supabaseServiceKey ? 'SET' : 'MISSING');

                    if (supabaseUrl && supabaseServiceKey) {
                        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                            auth: { autoRefreshToken: false, persistSession: false }
                        });
                        
                        // Try to get tier and subscription_plan from profiles table
                        let profile;
                        try {
                            // First try to get tier and subscription_plan
                            let { data, error } = await supabase
                                .from('profiles')
                                .select('tier, subscription_plan')
                                .eq('user_id', userId)
                                .single();

                            // If subscription_plan column doesn't exist, fall back to just tier
                            if (error && error.message && error.message.includes('subscription_plan')) {
                                console.log('[stripe-server] [get-subscription] subscription_plan column not found, trying without it');
                                const tierResult = await supabase
                                    .from('profiles')
                                    .select('tier')
                                    .eq('user_id', userId)
                                    .single();
                                data = tierResult.data;
                                error = tierResult.error;
                            }

                            if (error) {
                                console.error('[stripe-server] [get-subscription] Supabase query error:', error);
                                // Don't throw - let it fall through to create profile
                            }

                            profile = data;
                            console.log('[stripe-server] [get-subscription] Profile from Supabase:', JSON.stringify(profile));

                            // Auto-create profile if it doesn't exist (handles case where trigger failed)
                            if (!profile) {
                                console.log('[stripe-server] [get-subscription] No profile found - creating one');
                                try {
                                    const { data: newProfile, error: insertError } = await supabase
                                        .from('profiles')
                                        .insert({ user_id: userId, tier: 'free' })
                                        .select('tier')
                                        .single();

                                    if (insertError) {
                                        console.error('[stripe-server] [get-subscription] Failed to create profile:', insertError);
                                    } else {
                                        profile = newProfile;
                                        console.log('[stripe-server] [get-subscription] Created profile:', JSON.stringify(profile));
                                    }
                                } catch (createErr) {
                                    console.error('[stripe-server] [get-subscription] Error creating profile:', createErr.message);
                                }
                            }
                        } catch (err) {
                            console.error('[stripe-server] [get-subscription] Error fetching profile:', err.message);
                        }

                        if (profile?.tier === 'premium') {
                            // User is premium but subscription was lost (e.g., server restart)
                            // Use stored plan if available, otherwise default to monthly
                            const storedPlan = profile?.subscription_plan;
                            const planToUse = (storedPlan === 'annual' || storedPlan === 'monthly') ? storedPlan : 'monthly';
                            console.log('[stripe-server] [get-subscription] Recovering subscription for premium user with plan:', planToUse);
                            try {
                                const recoveredSub = mockSubscriptionService.createMockSubscription(userId, planToUse);
                                console.log('[stripe-server] [get-subscription] ✅ Successfully recovered subscription');
                                return res.json(recoveredSub);
                            } catch (recoverError) {
                                console.error('[stripe-server] [get-subscription] Failed to recover subscription:', recoverError.message);
                                return res.status(404).json({
                                    error: 'Failed to recover subscription. Please contact support.',
                                    hasPremiumTier: true
                                });
                            }
                        }
                    }
                    
                    // In mock mode, don't fall through to Stripe - return 404
                    return res.status(404).json({ 
                        error: 'No subscription found',
                        mockMode: true
                    });
                }
            } else {
                console.log('[stripe-server] [get-subscription] Mock service not available');
                return res.status(500).json({ 
                    error: 'Mock subscription service is not available',
                    mockMode: true
                });
            }
        } else {
            console.log('[stripe-server] [get-subscription] Mock mode disabled, using Stripe');
        }

        // Only proceed with Stripe if not in mock mode
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured and mock mode is disabled',
            });
        }

        console.log('[stripe-server] [get-subscription] Proceeding with Stripe API lookup...');
        // Get user email from Supabase
        let userEmail;
        try {
            userEmail = await getUserEmail(userId);
        } catch (error) {
            console.error('[stripe-server] Failed to get user email:', error);
            return res.status(404).json({ error: 'User not found' });
        }

        // Find Stripe customer by email
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });

        if (customers.data.length === 0) {
            console.log('[stripe-server] No Stripe customer found for email:', userEmail);
            // Check if user is premium in Supabase to provide better error message
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.VITE_SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });
            const { data: profile } = await supabase
                .from('profiles')
                .select('tier')
                .eq('user_id', userId)
                .single();
            
            if (profile?.tier === 'premium') {
                return res.status(404).json({ 
                    error: 'No Stripe subscription found. Your account shows as premium, but no active subscription was found in Stripe. Please contact support.',
                    hasPremiumTier: true
                });
            }
            return res.status(404).json({ error: 'No subscription found' });
        }

        const customer = customers.data[0];

        // Get active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1,
        });

        if (subscriptions.data.length === 0) {
            // Check for any subscriptions (including cancelled, past_due, etc.) to provide context
            const allSubscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                limit: 5,
            });
            
            console.log('[stripe-server] No active subscription found for customer:', customer.id);
            console.log('[stripe-server] Found', allSubscriptions.data.length, 'subscription(s) with other statuses');
            
            if (allSubscriptions.data.length > 0) {
                const statuses = allSubscriptions.data.map(sub => sub.status).join(', ');
                return res.status(404).json({ 
                    error: `No active subscription found. Found subscription(s) with status: ${statuses}`,
                    foundSubscriptions: allSubscriptions.data.map(sub => ({
                        id: sub.id,
                        status: sub.status,
                        cancelAtPeriodEnd: sub.cancel_at_period_end
                    }))
                });
            }
            
            // Check if user is premium in Supabase
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.VITE_SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });
            const { data: profile } = await supabase
                .from('profiles')
                .select('tier')
                .eq('user_id', userId)
                .single();
            
            if (profile?.tier === 'premium') {
                return res.status(404).json({ 
                    error: 'No active subscription found. Your account shows as premium, but no subscription was found in Stripe. Please contact support.',
                    hasPremiumTier: true
                });
            }
            
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscription = subscriptions.data[0];
        const priceId = subscription.items.data[0]?.price?.id;
        const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0; // Price in cents
        
        // Detect plan using multiple methods (in order of reliability):
        // 1. Check subscription metadata (set from checkout session)
        // 2. Check price ID match
        // 3. Infer from price amount
        let plan = 'unknown';
        
        // Method 1: Check subscription metadata (most reliable - set at creation)
        if (subscription.metadata?.plan && ['monthly', 'annual'].includes(subscription.metadata.plan)) {
            plan = subscription.metadata.plan;
            console.log('[stripe-server] [get-subscription] ✅ Plan detected from subscription metadata:', plan);
        }
        // Method 2: Check price ID match
        else if (priceId === PRICE_IDS.monthly) {
            plan = 'monthly';
            console.log('[stripe-server] [get-subscription] ✅ Plan detected by price ID (monthly):', priceId);
        } else if (priceId === PRICE_IDS.annual) {
            plan = 'annual';
            console.log('[stripe-server] [get-subscription] ✅ Plan detected by price ID (annual):', priceId);
        }
        // Method 3: Fallback - infer from price amount
        else {
            console.log('[stripe-server] [get-subscription] ⚠️ Plan detection failed by metadata and price ID, attempting fallback detection');
            console.log('[stripe-server] [get-subscription] Subscription metadata:', subscription.metadata);
            console.log('[stripe-server] [get-subscription] Price ID:', priceId);
            console.log('[stripe-server] [get-subscription] Price amount (cents):', priceAmount);
            console.log('[stripe-server] [get-subscription] Expected monthly price ID:', PRICE_IDS.monthly);
            console.log('[stripe-server] [get-subscription] Expected annual price ID:', PRICE_IDS.annual);
            
            // Use price amount to infer plan type
            // Annual plans are typically 10x monthly (e.g., $99.99 vs $9.99)
            // Threshold: if price > $50, likely annual; otherwise monthly
            const priceInDollars = priceAmount / 100;
            if (priceInDollars > 50) {
                plan = 'annual';
                console.log('[stripe-server] [get-subscription] ✅ Inferred plan as "annual" from price amount:', priceInDollars);
            } else {
                plan = 'monthly';
                console.log('[stripe-server] [get-subscription] ✅ Inferred plan as "monthly" from price amount:', priceInDollars);
            }
        }

        // Calculate discounted price if coupon is applied
        let currentPrice = priceAmount;
        let originalPrice = currentPrice;
        let discountPercent = 0;
        
        if (subscription.discount && subscription.discount.coupon) {
            const coupon = subscription.discount.coupon;
            if (coupon.percent_off) {
                discountPercent = coupon.percent_off;
                originalPrice = Math.round(currentPrice / (1 - discountPercent / 100));
            } else if (coupon.amount_off) {
                originalPrice = currentPrice + coupon.amount_off;
                discountPercent = Math.round((coupon.amount_off / originalPrice) * 100);
            }
        }

        const subscriptionDetails = {
            customerId: customer.id,
            subscriptionId: subscription.id,
            plan,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPrice: currentPrice / 100, // Convert from cents
            originalPrice: originalPrice / 100,
            discountPercent,
            hasRetentionDiscount: subscription.discount?.coupon?.id === 'RETENTION_30',
        };

        console.log('[stripe-server] [get-subscription] Found Stripe subscription:', subscriptionDetails);
        console.log('[stripe-server] [get-subscription] Plan:', plan, '| Price ID:', priceId, '| Original Price:', originalPrice / 100, '| Current Price:', currentPrice / 100);
        console.log('[stripe-server] [get-subscription] ✅ Successfully retrieved subscription from Stripe');
        res.json(subscriptionDetails);
    } catch (error) {
        console.error('[stripe-server] [get-subscription] ❌ Error getting subscription:', error);
        console.error('[stripe-server] [get-subscription] Error details:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: error.message || 'Failed to get subscription',
        });
    }
});

/**
 * Apply retention discount to subscription
 */
app.post('/api/apply-retention-discount', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        console.log('[stripe-server] Applying retention discount for user:', userId);

        // Check mock subscriptions first if enabled
        if (USE_MOCK_SUBSCRIPTIONS) {
            console.log('[stripe-server] [apply-retention-discount] Mock mode enabled, checking mock service...');
            // Lazy load mock service
            if (!mockSubscriptionService) {
                try {
                    console.log('[stripe-server] [apply-retention-discount] Loading mock subscription service...');
                    const mockServiceModule = await import('./mockSubscriptionService.js');
                    mockSubscriptionService = mockServiceModule;
                    console.log('[stripe-server] [apply-retention-discount] Mock subscription service loaded successfully');
                } catch (error) {
                    console.error('[stripe-server] [apply-retention-discount] Failed to load mock subscription service:', error.message);
                }
            }
            
            if (mockSubscriptionService) {
                const mockSub = mockSubscriptionService.getMockSubscription(userId);
                if (mockSub) {
                    const updated = mockSubscriptionService.applyRetentionDiscount(userId);
                    console.log('[stripe-server] [apply-retention-discount] Applied retention discount via mock service');
                    return res.json({
                        success: true,
                        subscriptionId: updated.subscriptionId,
                        discountApplied: true,
                    });
                } else {
                    // In mock mode, if no subscription exists, return error instead of falling through to Stripe
                    return res.status(404).json({ 
                        error: 'No subscription found. Please create a subscription first.',
                        mockMode: true
                    });
                }
            }
            
            // If we're in mock mode but service failed to load, don't fall through to Stripe
            return res.status(500).json({ 
                error: 'Mock subscription service is not available',
                mockMode: true
            });
        }

        // Only proceed with Stripe if not in mock mode
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured and mock mode is disabled',
            });
        }

        // Get user email and find subscription
        const userEmail = await getUserEmail(userId);
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });

        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'No customer found' });
        }

        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1,
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscription = subscriptions.data[0];

        // Check if retention discount already applied
        if (subscription.discount?.coupon?.id === 'RETENTION_30') {
            return res.json({
                success: true,
                message: 'Retention discount already applied',
                subscriptionId: subscription.id,
            });
        }

        // Create or retrieve retention coupon
        let coupon;
        try {
            coupon = await stripe.coupons.retrieve('RETENTION_30');
        } catch (error) {
            // Coupon doesn't exist, create it
            if (error.code === 'resource_missing') {
                coupon = await stripe.coupons.create({
                    id: 'RETENTION_30',
                    percent_off: 30,
                    duration: 'forever',
                    name: 'Retention Offer - 30% Off',
                });
                console.log('[stripe-server] Created retention coupon:', coupon.id);
            } else {
                throw error;
            }
        }

        // Apply coupon to subscription
        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            coupon: 'RETENTION_30',
        });

        console.log('[stripe-server] ✅ Applied retention discount to subscription:', subscription.id);
        res.json({
            success: true,
            subscriptionId: updatedSubscription.id,
            discountApplied: true,
        });
    } catch (error) {
        console.error('[stripe-server] Error applying retention discount:', error);
        res.status(500).json({
            error: error.message || 'Failed to apply retention discount',
        });
    }
});

/**
 * Cancel subscription with retention offer
 */
app.post('/api/cancel-subscription', async (req, res) => {
    try {
        const { userId, action } = req.body;

        if (!userId || !action) {
            return res.status(400).json({ error: 'Missing userId or action' });
        }

        if (!['accept_offer', 'cancel'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Must be "accept_offer" or "cancel"' });
        }

        console.log('[stripe-server] Processing subscription cancellation request:', { userId, action });

        // Check mock subscriptions first if enabled
        if (USE_MOCK_SUBSCRIPTIONS) {
            console.log('[stripe-server] [cancel-subscription] Mock mode enabled, checking mock service...');
            // Lazy load mock service
            if (!mockSubscriptionService) {
                try {
                    console.log('[stripe-server] [cancel-subscription] Loading mock subscription service...');
                    const mockServiceModule = await import('./mockSubscriptionService.js');
                    mockSubscriptionService = mockServiceModule;
                    console.log('[stripe-server] [cancel-subscription] Mock subscription service loaded successfully');
                } catch (error) {
                    console.error('[stripe-server] [cancel-subscription] Failed to load mock subscription service:', error.message);
                    return res.status(500).json({ error: 'Failed to load mock subscription service' });
                }
            }
            
            if (mockSubscriptionService) {
                const mockSub = mockSubscriptionService.getMockSubscription(userId);
                if (mockSub) {
                    const acceptOffer = action === 'accept_offer';
                    const updated = mockSubscriptionService.cancelMockSubscription(userId, acceptOffer);
                    
                    // Update tier if cancelling (not accepting offer)
                    if (!acceptOffer) {
                        await safeUpdateUserTier(userId, 'free', 'cancel-subscription');
                    }

                    console.log('[stripe-server] [cancel-subscription] Processed cancellation via mock service');
                    return res.json({
                        success: true,
                        action: acceptOffer ? 'accept_offer' : 'cancel',
                        subscriptionId: updated.subscriptionId,
                        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
                        currentPeriodEnd: updated.currentPeriodEnd,
                        message: acceptOffer 
                            ? 'Retention discount applied successfully'
                            : 'Subscription will be cancelled at the end of the billing period',
                    });
                } else {
                    // In mock mode, if no subscription exists, return error instead of falling through to Stripe
                    return res.status(404).json({ 
                        error: 'No subscription found. Please create a subscription first.',
                        mockMode: true
                    });
                }
            }
            
            // If we're in mock mode but service failed to load, don't fall through to Stripe
            return res.status(500).json({ 
                error: 'Mock subscription service is not available',
                mockMode: true
            });
        }

        // Only proceed with Stripe if not in mock mode
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured and mock mode is disabled',
            });
        }

        // Get user email and find subscription
        const userEmail = await getUserEmail(userId);
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });

        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'No customer found' });
        }

        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1,
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscription = subscriptions.data[0];

        if (action === 'accept_offer') {
            // Apply retention discount
            let coupon;
            try {
                coupon = await stripe.coupons.retrieve('RETENTION_30');
            } catch (error) {
                if (error.code === 'resource_missing') {
                    coupon = await stripe.coupons.create({
                        id: 'RETENTION_30',
                        percent_off: 30,
                        duration: 'forever',
                        name: 'Retention Offer - 30% Off',
                    });
                } else {
                    throw error;
                }
            }

            // Remove any cancellation that might be scheduled
            const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
                coupon: 'RETENTION_30',
                cancel_at_period_end: false,
            });

            console.log('[stripe-server] ✅ User accepted retention offer, discount applied');
            res.json({
                success: true,
                action: 'accept_offer',
                subscriptionId: updatedSubscription.id,
                message: 'Retention discount applied successfully',
            });
        } else {
            // Cancel subscription at period end
            const cancelledSubscription = await stripe.subscriptions.update(subscription.id, {
                cancel_at_period_end: true,
            });

            // Update user tier to free in Supabase
            // Note: We'll also handle this via webhook when subscription actually ends
            try {
                await updateUserTier(userId, 'free');
                console.log('[stripe-server] ✅ Updated user tier to free');
            } catch (tierError) {
                console.error('[stripe-server] ⚠️ Failed to update tier, will be handled by webhook:', tierError);
                // Don't fail the request - webhook will handle it
            }

            console.log('[stripe-server] ✅ Subscription scheduled for cancellation at period end');
            res.json({
                success: true,
                action: 'cancel',
                subscriptionId: cancelledSubscription.id,
                cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
                currentPeriodEnd: new Date(cancelledSubscription.current_period_end * 1000).toISOString(),
                message: 'Subscription will be cancelled at the end of the billing period',
            });
        }
    } catch (error) {
        console.error('[stripe-server] Error cancelling subscription:', error);
        res.status(500).json({
            error: error.message || 'Failed to cancel subscription',
        });
    }
});

/**
 * Create mock subscription (development only)
 */
app.post('/api/create-mock-subscription', async (req, res) => {
    if (!USE_MOCK_SUBSCRIPTIONS) {
        return res.status(403).json({ error: 'Mock subscriptions are not enabled' });
    }

    // Lazy load mock service
    if (!mockSubscriptionService) {
        try {
            console.log('[stripe-server] [create-mock-subscription] Loading mock subscription service...');
            const mockServiceModule = await import('./mockSubscriptionService.js');
            mockSubscriptionService = mockServiceModule;
            console.log('[stripe-server] [create-mock-subscription] Mock subscription service loaded successfully');
        } catch (error) {
            console.error('[stripe-server] [create-mock-subscription] Failed to load mock subscription service:', error.message);
            console.error('[stripe-server] [create-mock-subscription] Error stack:', error.stack);
            return res.status(500).json({ error: 'Failed to load mock subscription service' });
        }
    }

    try {
        const { userId, plan } = req.body;

        if (!userId || !plan) {
            return res.status(400).json({ error: 'Missing userId or plan' });
        }

        if (!['monthly', 'annual'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "annual"' });
        }

        console.log('[stripe-server] [create-mock-subscription] Creating mock subscription for user:', userId, 'plan:', plan);

        const subscription = mockSubscriptionService.createMockSubscription(userId, plan);
        console.log('[stripe-server] [create-mock-subscription] Mock subscription created successfully:', {
            subscriptionId: subscription.subscriptionId,
            customerId: subscription.customerId,
            plan: subscription.plan,
            status: subscription.status,
            currentPrice: subscription.currentPrice
        });

        await safeUpdateUserTier(userId, 'premium', 'create-mock-subscription');
        
        // Save subscription plan to profiles table
        try {
            await updateUserPlan(userId, plan);
            console.log('[stripe-server] [create-mock-subscription] ✅ Successfully saved subscription plan:', plan);
        } catch (planError) {
            console.error('[stripe-server] [create-mock-subscription] ⚠️ Failed to save subscription plan:', planError.message);
            // Don't fail the request if plan save fails
        }

        console.log('[stripe-server] [create-mock-subscription] Returning subscription data to client');
        res.json({
            success: true,
            subscription,
        });
    } catch (error) {
        console.error('[stripe-server] Error creating mock subscription:', error);
        res.status(500).json({
            error: error.message || 'Failed to create mock subscription',
        });
    }
});

/**
 * Restore cancelled subscription
 */
app.post('/api/restore-subscription', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        console.log('[stripe-server] Restoring subscription for user:', userId);

        // Check mock subscriptions first if enabled
        if (USE_MOCK_SUBSCRIPTIONS) {
            console.log('[stripe-server] [restore-subscription] Mock mode enabled, checking mock service...');
            // Lazy load mock service
            if (!mockSubscriptionService) {
                try {
                    console.log('[stripe-server] [restore-subscription] Loading mock subscription service...');
                    const mockServiceModule = await import('./mockSubscriptionService.js');
                    mockSubscriptionService = mockServiceModule;
                    console.log('[stripe-server] [restore-subscription] Mock subscription service loaded successfully');
                } catch (error) {
                    console.error('[stripe-server] [restore-subscription] Failed to load mock subscription service:', error.message);
                    return res.status(500).json({ error: 'Failed to load mock subscription service' });
                }
            }
            
            if (mockSubscriptionService) {
                let mockSub = mockSubscriptionService.getMockSubscription(userId);
                
                if (mockSub) {
                    // Restore existing subscription
                    const restored = mockSubscriptionService.restoreMockSubscription(userId);
                    
                    await safeUpdateUserTier(userId, 'premium', 'restore-subscription');

                    console.log('[stripe-server] [restore-subscription] Restored subscription via mock service');
                    return res.json({
                        success: true,
                        subscription: restored,
                        message: 'Subscription restored successfully',
                    });
                } else {
                    // No subscription found - check if user is premium and create one
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseUrl = process.env.VITE_SUPABASE_URL;
                    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                    
                    if (supabaseUrl && supabaseServiceKey) {
                        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                            auth: { autoRefreshToken: false, persistSession: false }
                        });
                        
                        // Try to get tier and subscription_plan, but handle missing column gracefully
                        let profile;
                        try {
                            const { data, error } = await supabase
                                .from('profiles')
                                .select('tier, subscription_plan')
                                .eq('user_id', userId)
                                .single();
                            
                            if (error && !(error.message && (error.message.includes('column') || error.message.includes('does not exist')))) {
                                throw error;
                            }
                            
                            profile = data;
                        } catch (err) {
                            // If column doesn't exist, try querying just tier
                            if (err.message && (err.message.includes('column') || err.message.includes('does not exist'))) {
                                console.warn('[stripe-server] [restore-subscription] subscription_plan column does not exist - trying without it');
                                const { data, error: tierError } = await supabase
                                    .from('profiles')
                                    .select('tier')
                                    .eq('user_id', userId)
                                    .single();
                                
                                if (tierError) {
                                    throw tierError;
                                }
                                
                                profile = data;
                            } else {
                                throw err;
                            }
                        }
                        
                        if (profile?.tier === 'premium') {
                            // User is premium but no subscription exists - create one using stored plan
                            const storedPlan = profile?.subscription_plan && ['monthly', 'annual'].includes(profile.subscription_plan)
                                ? profile.subscription_plan
                                : 'monthly'; // Default to monthly if no stored plan
                            
                            console.log('[stripe-server] [restore-subscription] User is premium but no subscription found - creating mock subscription with plan:', storedPlan);
                            const newSub = mockSubscriptionService.createMockSubscription(userId, storedPlan);
                            await safeUpdateUserTier(userId, 'premium', 'restore-subscription');
                            
                            // Ensure plan is saved (in case it wasn't before)
                            try {
                                await updateUserPlan(userId, storedPlan);
                            } catch (planError) {
                                console.warn('[stripe-server] [restore-subscription] Failed to save plan:', planError.message);
                            }
                            
                            return res.json({
                                success: true,
                                subscription: newSub,
                                message: 'Subscription recreated successfully (you were premium but subscription was missing)',
                            });
                        }
                    }
                    
                    // In mock mode, if no subscription exists, return error instead of falling through to Stripe
                    return res.status(404).json({ 
                        error: 'No subscription found to restore. Please create a subscription first.',
                        mockMode: true
                    });
                }
            }
            
            // If we're in mock mode but service failed to load, don't fall through to Stripe
            return res.status(500).json({ 
                error: 'Mock subscription service is not available',
                mockMode: true
            });
        }

        // Only proceed with Stripe if not in mock mode
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured and mock mode is disabled',
            });
        }

        // Real Stripe restore logic would go here
        // For now, return error if not using mocks
        return res.status(404).json({ error: 'No subscription found to restore' });
    } catch (error) {
        console.error('[stripe-server] Error restoring subscription:', error);
        res.status(500).json({
            error: error.message || 'Failed to restore subscription',
        });
    }
});

/**
 * Upgrade subscription from monthly to annual
 */
app.post('/api/upgrade-subscription', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        console.log('[stripe-server] [upgrade-subscription] Upgrading subscription for user:', userId);

        // Check mock subscriptions first if enabled
        if (USE_MOCK_SUBSCRIPTIONS) {
            console.log('[stripe-server] [upgrade-subscription] Mock mode enabled, checking mock service...');
            // Lazy load mock service
            if (!mockSubscriptionService) {
                try {
                    console.log('[stripe-server] [upgrade-subscription] Loading mock subscription service...');
                    const mockServiceModule = await import('./mockSubscriptionService.js');
                    mockSubscriptionService = mockServiceModule;
                    console.log('[stripe-server] [upgrade-subscription] Mock subscription service loaded successfully');
                } catch (error) {
                    console.error('[stripe-server] [upgrade-subscription] Failed to load mock subscription service:', error.message);
                    return res.status(500).json({ error: 'Failed to load mock subscription service' });
                }
            }
            
            if (mockSubscriptionService) {
                const mockSub = mockSubscriptionService.getMockSubscription(userId);
                if (mockSub) {
                    // Check if subscription is monthly
                    if (mockSub.plan !== 'monthly') {
                        return res.status(400).json({ 
                            error: `Cannot upgrade. Current plan is ${mockSub.plan}. Only monthly subscriptions can be upgraded to annual.`,
                            currentPlan: mockSub.plan
                        });
                    }

                    // Upgrade to annual
                    const upgraded = mockSubscriptionService.upgradeToAnnual(userId);
                    
                    // Update plan in database
                    try {
                        await updateUserPlan(userId, 'annual');
                        console.log('[stripe-server] [upgrade-subscription] ✅ Saved annual plan to database');
                    } catch (planError) {
                        console.warn('[stripe-server] [upgrade-subscription] ⚠️ Failed to save plan:', planError.message);
                        // Don't fail the request if plan save fails
                    }

                    console.log('[stripe-server] [upgrade-subscription] ✅ Successfully upgraded subscription to annual');
                    return res.json({
                        success: true,
                        subscription: upgraded,
                        message: `Your subscription will be upgraded to Annual at the end of your current billing period (${new Date(upgraded.upgradeScheduledDate).toLocaleDateString()}). You'll be billed $${upgraded.originalPrice} per year starting then.`,
                    });
                } else {
                    return res.status(404).json({ 
                        error: 'No subscription found. Please create a subscription first.',
                        mockMode: true
                    });
                }
            }
            
            // If we're in mock mode but service failed to load, don't fall through to Stripe
            return res.status(500).json({ 
                error: 'Mock subscription service is not available',
                mockMode: true
            });
        }

        // Only proceed with Stripe if not in mock mode
        if (!isStripeAvailable()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured and mock mode is disabled',
            });
        }

        // Real Stripe upgrade logic
        // Get user email and find subscription
        const userEmail = await getUserEmail(userId);
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });

        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'No customer found' });
        }

        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1,
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscription = subscriptions.data[0];
        const currentPriceId = subscription.items.data[0]?.price?.id;
        
        // Check if already annual
        if (currentPriceId === PRICE_IDS.annual) {
            return res.status(400).json({ 
                error: 'Subscription is already on the annual plan',
                currentPlan: 'annual'
            });
        }

        // Check if monthly
        if (currentPriceId !== PRICE_IDS.monthly) {
            return res.status(400).json({ 
                error: 'Can only upgrade from monthly to annual plan',
                currentPlan: 'unknown'
            });
        }

        // Update subscription to annual, effective at period end
        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            items: [{
                id: subscription.items.data[0].id,
                price: PRICE_IDS.annual,
            }],
            proration_behavior: 'none', // Don't prorate - change at period end
            billing_cycle_anchor: 'unchanged', // Keep current billing cycle
            metadata: {
                ...subscription.metadata,
                plan: 'annual',
            },
        });

        // Update plan in database
        try {
            await updateUserPlan(userId, 'annual');
            console.log('[stripe-server] [upgrade-subscription] ✅ Saved annual plan to database');
        } catch (planError) {
            console.warn('[stripe-server] [upgrade-subscription] ⚠️ Failed to save plan:', planError.message);
        }

        console.log('[stripe-server] [upgrade-subscription] ✅ Successfully upgraded Stripe subscription to annual');
        res.json({
            success: true,
            subscriptionId: updatedSubscription.id,
            message: `Your subscription will be upgraded to Annual at the end of your current billing period (${new Date(updatedSubscription.current_period_end * 1000).toLocaleDateString()}).`,
        });
    } catch (error) {
        console.error('[stripe-server] Error upgrading subscription:', error);
        res.status(500).json({
            error: error.message || 'Failed to upgrade subscription',
        });
    }
});

/**
 * Debug endpoint to list all mock subscriptions (development only)
 */
app.get('/api/debug/mock-subscriptions', async (req, res) => {
    if (!USE_MOCK_SUBSCRIPTIONS) {
        return res.status(403).json({ error: 'Mock subscriptions are not enabled' });
    }

    // Lazy load mock service
    if (!mockSubscriptionService) {
        try {
            const mockServiceModule = await import('./mockSubscriptionService.js');
            mockSubscriptionService = mockServiceModule;
        } catch (error) {
            return res.status(500).json({ error: 'Failed to load mock subscription service' });
        }
    }

    try {
        const allSubscriptions = mockSubscriptionService.getAllMockSubscriptions();
        const subscriptionsArray = Array.from(allSubscriptions.entries()).map(([userId, sub]) => ({
            userId,
            subscription: sub
        }));

        res.json({
            count: subscriptionsArray.length,
            subscriptions: subscriptionsArray,
            mockModeEnabled: USE_MOCK_SUBSCRIPTIONS
        });
    } catch (error) {
        console.error('[stripe-server] Error getting mock subscriptions:', error);
        res.status(500).json({ error: error.message || 'Failed to get mock subscriptions' });
    }
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dev Email Inbox Endpoints (Development Only)
if (isDevelopment) {
    app.get('/api/dev/emails', (req, res) => {
        const emails = getDevEmails();
        res.json(emails);
    });

    app.delete('/api/dev/emails', (req, res) => {
        clearDevEmails();
        res.json({ success: true, message: 'Dev email inbox cleared' });
    });
}

app.listen(PORT, () => {
    console.log(`[stripe-server] Server running on port ${PORT}`);
    console.log(`[stripe-server] Webhook endpoint: http://localhost:${PORT}/api/stripe-webhook`);
    console.log(`[stripe-server] Setup check endpoint: http://localhost:${PORT}/api/setup-check`);
    console.log(`[stripe-server] Get subscription endpoint: http://localhost:${PORT}/api/get-subscription`);
    console.log(`[stripe-server] Health check endpoint: http://localhost:${PORT}/health`);
    console.log(`[stripe-server] ✅ All routes registered successfully`);
});


