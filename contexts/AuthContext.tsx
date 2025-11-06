import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

// Auth Context Interface
interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to auth state changes
    useEffect(() => {
        console.log('[AuthProvider] Initializing auth listener');

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            console.warn('[AuthProvider] Supabase is not configured. Auth features will be unavailable.');
            console.warn('[AuthProvider] Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
            setLoading(false);
            return;
        }

        try {
            const supabase = getSupabaseClient();
            const { data: authListener } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    console.log('[AuthProvider] Auth state changed:', event);
                    
                    if (session?.user) {
                        console.log('[AuthProvider] User logged in:', session.user.id);
                        setUser(session.user);
                    } else {
                        console.log('[AuthProvider] User logged out');
                        setUser(null);
                    }
                    
                    setLoading(false);
                }
            );

            // Cleanup listener on unmount
            return () => {
                if (authListener) {
                    authListener.subscription.unsubscribe();
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth listener';
            console.error('[AuthProvider] Error initializing auth listener:', errorMessage);
            setLoading(false);
        }
    }, []);

    /**
     * Sign in with email and password
     */
    const signIn = async (email: string, password: string): Promise<void> => {
        try {
            console.log('[AuthProvider] Signing in user:', email);
            setLoading(true);

            if (!isSupabaseConfigured()) {
                const errorMsg = 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.';
                console.error('[AuthProvider]', errorMsg);
                throw new Error(errorMsg);
            }

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('[AuthProvider] Sign in failed:', error.message);
                throw new Error(error.message);
            }

            console.log('[AuthProvider] User signed in successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
            console.error('[AuthProvider] Error in signIn:', errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sign up with email and password
     */
    const signUp = async (email: string, password: string): Promise<void> => {
        try {
            console.log('[AuthProvider] Signing up user:', email);
            setLoading(true);

            if (!isSupabaseConfigured()) {
                const errorMsg = 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.';
                console.error('[AuthProvider]', errorMsg);
                throw new Error(errorMsg);
            }

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                console.error('[AuthProvider] Sign up failed:', error.message);
                throw new Error(error.message);
            }

            console.log('[AuthProvider] User signed up successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
            console.error('[AuthProvider] Error in signUp:', errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sign out the current user
     */
    const signOut = async (): Promise<void> => {
        try {
            console.log('[AuthProvider] Signing out user');
            setLoading(true);

            if (!isSupabaseConfigured()) {
                console.warn('[AuthProvider] Supabase not configured, clearing local user state');
                setUser(null);
                return;
            }

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('[AuthProvider] Sign out failed:', error.message);
                throw new Error(error.message);
            }

            console.log('[AuthProvider] User signed out successfully');
            setUser(null);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
            console.error('[AuthProvider] Error in signOut:', errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Send password reset email
     */
    const resetPassword = async (email: string): Promise<void> => {
        try {
            console.log('[AuthProvider] Sending password reset email:', email);
            setLoading(true);

            if (!isSupabaseConfigured()) {
                const errorMsg = 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.';
                console.error('[AuthProvider]', errorMsg);
                throw new Error(errorMsg);
            }

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                console.error('[AuthProvider] Password reset failed:', error.message);
                throw new Error(error.message);
            }

            console.log('[AuthProvider] Password reset email sent successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            console.error('[AuthProvider] Error in resetPassword:', errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use the Auth Context
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

// Export the context for advanced usage
export { AuthContext };

