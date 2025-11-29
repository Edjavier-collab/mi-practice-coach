/**
 * Mock Subscription Service
 * Simulates Stripe subscriptions for development and testing
 * Stores subscriptions in memory (lost on server restart)
 */

// In-memory storage for mock subscriptions
const mockSubscriptions = new Map();

// Pricing constants
const PRICING = {
    monthly: { original: 9.99, discounted: 6.99 },
    annual: { original: 99.99, discounted: 69.99 },
};

/**
 * Generate a mock customer ID
 */
const generateCustomerId = (userId) => {
    return `cus_mock_${userId.substring(0, 8)}`;
};

/**
 * Generate a mock subscription ID
 */
const generateSubscriptionId = (userId) => {
    return `sub_mock_${userId.substring(0, 8)}_${Date.now()}`;
};

/**
 * Calculate next billing date (30 days for monthly, 365 for annual)
 */
const calculateNextBillingDate = (plan) => {
    const days = plan === 'monthly' ? 30 : 365;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
};

const isValidPlan = (plan) => Object.prototype.hasOwnProperty.call(PRICING, plan);

/**
 * Create a mock subscription (idempotent - returns existing subscription if it exists)
 */
export const createMockSubscription = (userId, plan) => {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
        throw new Error('Invalid userId provided for mock subscription');
    }

    if (!isValidPlan(plan)) {
        throw new Error(`Invalid plan "${plan}". Expected one of: ${Object.keys(PRICING).join(', ')}`);
    }

    // Check if subscription already exists - return it if it does (idempotent)
    const existing = mockSubscriptions.get(userId);
    if (existing) {
        console.log('[mockSubscriptionService] Subscription already exists for user:', userId, '- returning existing subscription');
        // Update plan if different
        const cleanedPlan = plan.trim();
        if (existing.plan !== cleanedPlan) {
            const pricing = PRICING[cleanedPlan];
            existing.plan = cleanedPlan;
            existing.currentPrice = pricing.original;
            existing.originalPrice = pricing.original;
            existing.currentPeriodEnd = calculateNextBillingDate(cleanedPlan);
            console.log('[mockSubscriptionService] Updated plan to:', cleanedPlan);
        }
        return existing;
    }

    const cleanedPlan = plan.trim();
    const customerId = generateCustomerId(userId);
    const subscriptionId = generateSubscriptionId(userId);
    const pricing = PRICING[cleanedPlan];

    const subscription = {
        customerId,
        subscriptionId,
        plan: cleanedPlan,
        status: 'active',
        currentPeriodEnd: calculateNextBillingDate(plan),
        cancelAtPeriodEnd: false,
        currentPrice: pricing.original,
        originalPrice: pricing.original,
        discountPercent: 0,
        hasRetentionDiscount: false,
    };

    mockSubscriptions.set(userId, subscription);
    console.log('[mockSubscriptionService] Created mock subscription for user:', userId, subscription);
    return subscription;
};

/**
 * Get mock subscription for a user
 */
export const getMockSubscription = (userId) => {
    const subscription = mockSubscriptions.get(userId);
    if (subscription) {
        console.log('[mockSubscriptionService] Retrieved mock subscription for user:', userId);
        console.log('[mockSubscriptionService] Subscription details:', {
            plan: subscription.plan,
            originalPrice: subscription.originalPrice,
            currentPrice: subscription.currentPrice,
            periodLabel: subscription.plan === 'monthly' ? 'month' : 'year'
        });
    } else {
        console.log('[mockSubscriptionService] No mock subscription found for user:', userId);
    }
    return subscription || null;
};

/**
 * Cancel mock subscription with retention offer option (idempotent)
 */
export const cancelMockSubscription = (userId, acceptOffer) => {
    const subscription = mockSubscriptions.get(userId);
    if (!subscription) {
        throw new Error('No subscription found');
    }

    if (acceptOffer) {
        // Apply retention discount (idempotent - if already applied, no change)
        if (subscription.hasRetentionDiscount) {
            console.log('[mockSubscriptionService] Retention discount already applied for user:', userId);
            return subscription;
        }
        
        const discountPercent = 30;
        const pricing = PRICING[subscription.plan];
        subscription.currentPrice = pricing.discounted;
        subscription.originalPrice = pricing.original;
        subscription.discountPercent = discountPercent;
        subscription.hasRetentionDiscount = true;
        subscription.cancelAtPeriodEnd = false; // Remove any scheduled cancellation
        subscription.status = 'active';
        console.log('[mockSubscriptionService] Applied retention discount to subscription for user:', userId);
    } else {
        // Cancel at period end (idempotent - if already cancelled, no change)
        if (subscription.cancelAtPeriodEnd) {
            console.log('[mockSubscriptionService] Subscription already scheduled for cancellation for user:', userId);
            return subscription;
        }
        
        subscription.cancelAtPeriodEnd = true;
        subscription.status = 'active'; // Still active until period ends
        console.log('[mockSubscriptionService] Scheduled cancellation for user:', userId);
    }

    mockSubscriptions.set(userId, subscription);
    return subscription;
};

/**
 * Restore a cancelled mock subscription (idempotent - creates subscription if missing)
 */
export const restoreMockSubscription = (userId) => {
    let subscription = mockSubscriptions.get(userId);
    
    if (!subscription) {
        // No subscription found - create a default one (better restore behavior)
        console.log('[mockSubscriptionService] No subscription found for user:', userId, '- creating default subscription');
        subscription = createMockSubscription(userId, 'monthly');
        console.log('[mockSubscriptionService] Created default subscription for restore');
        return subscription;
    }

    // If already active and not cancelled, return as-is (idempotent)
    if (subscription.status === 'active' && !subscription.cancelAtPeriodEnd) {
        console.log('[mockSubscriptionService] Subscription already active for user:', userId);
        return subscription;
    }

    // Restore the subscription
    subscription.cancelAtPeriodEnd = false;
    
    // If subscription was past due, reactivate it
    if (subscription.status === 'past_due') {
        console.log('[mockSubscriptionService] Reactivating past_due subscription for user:', userId);
    }
    
    // Set status to active (handles both cancelled and past_due cases)
    subscription.status = 'active';

    mockSubscriptions.set(userId, subscription);
    console.log('[mockSubscriptionService] Restored subscription for user:', userId);
    return subscription;
};

/**
 * Apply retention discount to mock subscription
 */
export const applyRetentionDiscount = (userId) => {
    const subscription = mockSubscriptions.get(userId);
    if (!subscription) {
        throw new Error('No subscription found');
    }

    if (subscription.hasRetentionDiscount) {
        console.log('[mockSubscriptionService] Retention discount already applied for user:', userId);
        return subscription;
    }

    const discountPercent = 30;
    const pricing = PRICING[subscription.plan];
    subscription.currentPrice = pricing.discounted;
    subscription.originalPrice = pricing.original;
    subscription.discountPercent = discountPercent;
    subscription.hasRetentionDiscount = true;
    subscription.cancelAtPeriodEnd = false; // Remove any scheduled cancellation

    mockSubscriptions.set(userId, subscription);
    console.log('[mockSubscriptionService] Applied retention discount for user:', userId);
    return subscription;
};

/**
 * Delete a mock subscription (for testing)
 */
export const deleteMockSubscription = (userId) => {
    const deleted = mockSubscriptions.delete(userId);
    if (deleted) {
        console.log('[mockSubscriptionService] Deleted mock subscription for user:', userId);
    }
    return deleted;
};

/**
 * Upgrade monthly subscription to annual (scheduled for end of current period)
 */
export const upgradeToAnnual = (userId) => {
    const subscription = mockSubscriptions.get(userId);
    if (!subscription) {
        throw new Error('No subscription found');
    }

    if (subscription.plan === 'annual') {
        console.log('[mockSubscriptionService] Subscription is already annual for user:', userId);
        return subscription;
    }

    if (subscription.plan !== 'monthly') {
        throw new Error(`Cannot upgrade from ${subscription.plan} plan. Only monthly subscriptions can be upgraded.`);
    }

    // Schedule upgrade to take effect at end of current period
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const annualPricing = PRICING.annual;
    
    // Update plan to annual
    subscription.plan = 'annual';
    subscription.originalPrice = annualPricing.original;
    
    // Calculate new price - if they have retention discount, apply it to annual
    if (subscription.hasRetentionDiscount) {
        subscription.currentPrice = annualPricing.discounted;
    } else {
        subscription.currentPrice = annualPricing.original;
    }
    
    // Set new billing period end (365 days from current period end)
    const newPeriodEnd = new Date(currentPeriodEnd);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 365);
    subscription.currentPeriodEnd = newPeriodEnd.toISOString();
    
    // Mark that upgrade is scheduled (for display purposes)
    subscription.upgradeScheduled = true;
    subscription.upgradeScheduledDate = currentPeriodEnd.toISOString();

    mockSubscriptions.set(userId, subscription);
    console.log('[mockSubscriptionService] Upgraded subscription to annual, effective at period end:', currentPeriodEnd.toISOString());
    return subscription;
};

/**
 * Get all mock subscriptions (for debugging)
 */
export const getAllMockSubscriptions = () => {
    return new Map(mockSubscriptions);
};

