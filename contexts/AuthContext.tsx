import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

// Sign up result interface
export interface SignUpResult {
    requiresConfirmation: boolean;
    email: string;
}

// Auth Context Interface
interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<SignUpResult>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    resendSignUpConfirmation: (email: string) => Promise<void>;
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
                // In mock mode, we set user immediately so we can set loading to false
                setLoading(false);
                return;
            }

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('[AuthProvider] Sign in failed:', error.message);
                setLoading(false); // Set loading to false on error
                throw new Error(error.message);
            }

            console.log('[AuthProvider] User signed in successfully');
            // Don't set loading to false here - let onAuthStateChange handle it
            // This ensures loading stays true until user state is actually updated
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
            console.error('[AuthProvider] Error in signIn:', errorMessage);
            // Only set loading to false if we haven't already (for Supabase errors)
            if (isSupabaseConfigured()) {
                setLoading(false);
            }
            throw error;
        }
    };

    /**
     * Sign up with email and password
     * Returns information about whether email confirmation is required
     */
    const signUp = async (email: string, password: string): Promise<SignUpResult> => {
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
                // In mock mode, we set user immediately so we can set loading to false
                setLoading(false);
                // Mock mode doesn't require confirmation
                return { requiresConfirmation: false, email };
            }

            const supabase = getSupabaseClient();
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/`,
                },
            });

            if (error) {
                console.error('[AuthProvider] Sign up failed:', error.message);
                setLoading(false); // Set loading to false on error
                throw new Error(error.message);
            }

            // Log signup response details for debugging
            console.log('[AuthProvider] Sign up response:', {
                user: data.user ? {
                    id: data.user.id,
                    email: data.user.email,
                    email_confirmed_at: data.user.email_confirmed_at,
                    confirmation_sent_at: data.user.confirmation_sent_at,
                } : null,
                session: data.session ? 'exists' : 'null',
            });

            // Check if user is signed in (session exists)
            // If no session, email confirmation is required
            const { data: sessionData } = await supabase.auth.getSession();
            const requiresConfirmation = !sessionData?.session;

            // Check if confirmation email was sent
            const confirmationSent = data.user?.confirmation_sent_at !== null && data.user?.confirmation_sent_at !== undefined;
            
            if (confirmationSent) {
                console.log('[AuthProvider] ✅ Confirmation email was sent at:', data.user?.confirmation_sent_at);
            } else {
                console.warn('[AuthProvider] ⚠️  Confirmation email was NOT sent. Check Supabase email settings:');
                console.warn('  1. Go to Supabase Dashboard > Authentication > Providers > Email');
                console.warn('  2. Ensure "Confirm email" is enabled');
                console.warn('  3. Check SMTP settings in Project Settings > Auth');
                console.warn('  4. Verify email templates are configured');
            }

            // Always show confirmation message if Supabase is configured
            // Supabase sends a confirmation email by default, even if email confirmation is disabled
            // The difference is whether the user is immediately signed in or not
            if (requiresConfirmation) {
                console.log('[AuthProvider] User signed up successfully, but email confirmation is required');
                // User won't be logged in, so set loading to false
                setLoading(false);
            } else {
                console.log('[AuthProvider] User signed up and logged in successfully (email confirmation may still be sent)');
                // Even if user is signed in, Supabase may have sent a confirmation email
                // Check if user email is confirmed
                if (data.user && !data.user.email_confirmed_at) {
                    // User is signed in but email is not confirmed - show confirmation message
                    // Don't set loading to false here - let onAuthStateChange handle it since user is logged in
                    return { requiresConfirmation: true, email };
                }
                // User is signed in - don't set loading to false, let onAuthStateChange handle it
            }

            return { requiresConfirmation, email };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
            console.error('[AuthProvider] Error in signUp:', errorMessage);
            // Only set loading to false if we haven't already (for Supabase errors)
            if (isSupabaseConfigured()) {
                setLoading(false);
            }
            throw error;
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

    /**
     * Update user password (used after password reset)
     */
    const updatePassword = async (newPassword: string): Promise<void> => {
        try {
            console.log('[AuthProvider] Updating password');
            setLoading(true);

            if (!isSupabaseConfigured()) {
                // Mock password update
                console.log('[AuthProvider] Mock password update - password changed');
                await new Promise(resolve => setTimeout(resolve, 500));
                return;
            }

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                console.error('[AuthProvider] Password update failed:', error.message);
                throw new Error(error.message);
            }

            console.log('[AuthProvider] Password updated successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password update failed';
            console.error('[AuthProvider] Error in updatePassword:', errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Resend sign-up confirmation email
     */
    const resendSignUpConfirmation = async (email: string): Promise<void> => {
        try {
            console.log('[AuthProvider] Resending sign-up confirmation email:', email);
            setLoading(true);

            if (!isSupabaseConfigured()) {
                // Mock resend - just log it
                console.log('[AuthProvider] Mock resend confirmation - email sent to:', email);
                await new Promise(resolve => setTimeout(resolve, 500));
                return;
            }

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) {
                console.error('[AuthProvider] Resend confirmation failed:', error.message);
                throw new Error(error.message);
            }

            console.log('[AuthProvider] Confirmation email resent successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend confirmation email';
            console.error('[AuthProvider] Error in resendSignUpConfirmation:', errorMessage);
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
        updatePassword,
        resendSignUpConfirmation,
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

