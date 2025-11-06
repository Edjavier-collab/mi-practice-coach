import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { Session, UserTier } from '@/types';

// Database type definitions
interface DbSession {
    id: string;
    user_id: string;
    session_data: Session;
    created_at: string;
}

interface DbUserProfile {
    id: string;
    user_id: string;
    tier: UserTier;
    created_at: string;
    updated_at: string;
}

/**
 * Save a practice session to the database
 */
export const saveSession = async (session: Session, userId: string): Promise<string> => {
    try {
        console.log('[databaseService] Saving session for user:', userId);
        
        if (!isSupabaseConfigured()) {
            const errorMsg = 'Supabase is not configured. Session cannot be saved to database.';
            console.warn('[databaseService]', errorMsg);
            throw new Error(errorMsg);
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('sessions')
            .insert({
                user_id: userId,
                session_data: session,
                created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error) {
            console.error('[databaseService] Failed to save session:', error);
            throw new Error(`Failed to save session: ${error.message}`);
        }

        if (!data || !data.id) {
            throw new Error('No session ID returned from database');
        }

        console.log('[databaseService] Session saved with ID:', data.id);
        return data.id;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[databaseService] Error in saveSession:', errorMessage);
        throw error;
    }
};

/**
 * Get all sessions for a user
 */
export const getUserSessions = async (userId: string): Promise<Session[]> => {
    try {
        console.log('[databaseService] Fetching sessions for user:', userId);
        
        if (!isSupabaseConfigured()) {
            console.warn('[databaseService] Supabase is not configured. Cannot fetch sessions from database.');
            return [];
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('sessions')
            .select('session_data')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[databaseService] Failed to fetch sessions:', error);
            throw new Error(`Failed to fetch sessions: ${error.message}`);
        }

        if (!data) {
            console.log('[databaseService] No sessions found for user');
            return [];
        }

        const sessions = data.map((row: { session_data: Session }) => row.session_data);
        console.log(`[databaseService] Retrieved ${sessions.length} sessions for user`);
        return sessions;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[databaseService] Error in getUserSessions:', errorMessage);
        throw error;
    }
};

/**
 * Count sessions for a user within a time period
 */
export const getSessionCount = async (userId: string, startDate: Date): Promise<number> => {
    try {
        console.log('[databaseService] Counting sessions for user:', userId, 'since:', startDate);
        
        if (!isSupabaseConfigured()) {
            console.warn('[databaseService] Supabase is not configured. Returning 0 for session count.');
            return 0;
        }

        const supabase = getSupabaseClient();
        const { count, error } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString());

        if (error) {
            console.error('[databaseService] Failed to count sessions:', error);
            throw new Error(`Failed to count sessions: ${error.message}`);
        }

        const sessionCount = count ?? 0;
        console.log(`[databaseService] User has ${sessionCount} sessions since ${startDate}`);
        return sessionCount;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[databaseService] Error in getSessionCount:', errorMessage);
        throw error;
    }
};

/**
 * Update user's subscription tier
 */
export const updateUserTier = async (userId: string, tier: UserTier): Promise<void> => {
    try {
        console.log('[databaseService] Updating tier for user:', userId, 'to:', tier);
        
        if (!isSupabaseConfigured()) {
            console.warn('[databaseService] Supabase is not configured. Cannot update user tier.');
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('profiles')
            .update({
                tier,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (error) {
            console.error('[databaseService] Failed to update tier:', error);
            throw new Error(`Failed to update user tier: ${error.message}`);
        }

        console.log('[databaseService] User tier updated successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[databaseService] Error in updateUserTier:', errorMessage);
        throw error;
    }
};

/**
 * Get user profile data
 */
export const getUserProfile = async (userId: string): Promise<DbUserProfile> => {
    try {
        console.log('[databaseService] Fetching profile for user:', userId);
        
        if (!isSupabaseConfigured()) {
            const errorMsg = 'Supabase is not configured. Cannot fetch user profile.';
            console.warn('[databaseService]', errorMsg);
            throw new Error(errorMsg);
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('[databaseService] Failed to fetch profile:', error);
            throw new Error(`Failed to fetch user profile: ${error.message}`);
        }

        if (!data) {
            throw new Error('User profile not found');
        }

        console.log('[databaseService] User profile retrieved successfully');
        return data as DbUserProfile;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[databaseService] Error in getUserProfile:', errorMessage);
        throw error;
    }
};

