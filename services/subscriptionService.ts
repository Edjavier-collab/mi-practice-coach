import { getSessionCount, getUserSessions } from './databaseService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { UserTier } from '@/types';

// Free tier limit: 3 sessions per month
const FREE_TIER_MONTHLY_LIMIT = 3;

/**
 * Get the start of the current month in ISO format
 */
const getCurrentMonthStart = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

/**
 * Check if user can start a new session based on their tier and current month's usage
 */
export const canStartSession = async (userId: string, userTier: UserTier): Promise<boolean> => {
    try {
        console.log('[subscriptionService] Checking if user can start session:', { userId, userTier });

        // Premium users have unlimited sessions
        if (userTier === UserTier.Premium) {
            console.log('[subscriptionService] Premium user - unlimited sessions');
            return true;
        }

        // Free users have a monthly limit
        if (userTier === UserTier.Free) {
            const sessionsThisMonth = await getSessionsThisMonth(userId);
            const canStart = sessionsThisMonth < FREE_TIER_MONTHLY_LIMIT;
            
            console.log('[subscriptionService] Free user - sessions this month:', sessionsThisMonth, 'limit:', FREE_TIER_MONTHLY_LIMIT, 'can start:', canStart);
            return canStart;
        }

        // Unknown tier - default to allowing (or could throw error)
        console.warn('[subscriptionService] Unknown user tier:', userTier);
        return true;
    } catch (error) {
        console.error('[subscriptionService] Error checking if user can start session:', error);
        // If Supabase is configured, fail-closed (deny session) on errors to prevent abuse
        // If Supabase is not configured, fail-open to allow mock/offline testing
        const shouldFailClosed = isSupabaseConfigured();
        console.warn('[subscriptionService] Using', shouldFailClosed ? 'fail-closed' : 'fail-open', 'strategy');
        return !shouldFailClosed;
    }
};

/**
 * Get count of free sessions used this month
 */
export const getSessionsThisMonth = async (userId: string): Promise<number> => {
    try {
        console.log('[subscriptionService] Getting sessions this month for user:', userId);
        
        const monthStart = getCurrentMonthStart();
        const count = await getSessionCount(userId, monthStart);
        
        console.log('[subscriptionService] Sessions this month:', count);
        return count;
    } catch (error) {
        console.error('[subscriptionService] Error getting sessions this month:', error);
        // Fallback: try to get count from all sessions
        try {
            const allSessions = await getUserSessions(userId);
            const now = new Date();
            const monthStart = getCurrentMonthStart();
            const sessionsThisMonth = allSessions.filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate >= monthStart && sessionDate <= now;
            });
            return sessionsThisMonth.length;
        } catch (fallbackError) {
            console.error('[subscriptionService] Fallback also failed:', fallbackError);
            return 0;
        }
    }
};

/**
 * Get remaining free sessions for the current month
 */
export const getRemainingFreeSessions = async (userId: string): Promise<number> => {
    try {
        console.log('[subscriptionService] Getting remaining free sessions for user:', userId);
        
        const sessionsThisMonth = await getSessionsThisMonth(userId);
        const remaining = Math.max(0, FREE_TIER_MONTHLY_LIMIT - sessionsThisMonth);
        
        console.log('[subscriptionService] Remaining free sessions:', remaining);
        return remaining;
    } catch (error) {
        console.error('[subscriptionService] Error getting remaining free sessions:', error);
        // On error, return 0 to be conservative
        return 0;
    }
};

