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

// Mock user helper - creates a mock Supabase User object
const createMockUser = (email: string): User => {
    return {
        id: `mock-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
        email: email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_confirmed_at: new Date().toISOString(),
        invited_at: null,
        action_link: null,
        phone: null,
        phone_confirmed_at: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
    } as User;
};

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to auth state changes
    useEffect(() => {
        console.log('[AuthProvider] Initializing auth listener');

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            console.warn('[AuthProvider] Supabase is not configured. Using mock authentication mode.');
            console.warn('[AuthProvider] Mock users will be stored in localStorage.');
            
            // Try to restore mock user from localStorage
            const mockUserData = localStorage.getItem('mock_user');
            if (mockUserData) {
                try {
                    const parsed = JSON.parse(mockUserData);
                    setUser(createMockUser(parsed.email));
                    console.log('[AuthProvider] Restored mock user from localStorage');
                } catch (error) {
                    console.error('[AuthProvider] Failed to restore mock user:', error);
                }
            }
            
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
                // Mock authentication - accept any email/password combo
                console.log('[AuthProvider] Using mock authentication');
                
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // In mock mode, accept any email/password
                const mockUser = createMockUser(email);
                setUser(mockUser);
                
                // Store in localStorage for persistence
                localStorage.setItem('mock_user', JSON.stringify({ email }));
                
                console.log('[AuthProvider] Mock sign in successful');
                return;
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
                // Mock sign up - accept any email/password combo
                console.log('[AuthProvider] Using mock sign up');
                
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // In mock mode, accept any email/password
                const mockUser = createMockUser(email);
                setUser(mockUser);
                
                // Store in localStorage for persistence
                localStorage.setItem('mock_user', JSON.stringify({ email }));
                
                console.log('[AuthProvider] Mock sign up successful');
                return;
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
                localStorage.removeItem('mock_user');
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
                // Mock password reset - just log it
                console.log('[AuthProvider] Mock password reset - email sent to:', email);
                console.log('[AuthProvider] In mock mode, password reset is simulated.');
                await new Promise(resolve => setTimeout(resolve, 500));
                return;
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

