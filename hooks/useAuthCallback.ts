import { useEffect } from 'react';
import { View } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

interface UseAuthCallbackOptions {
  setView: (view: View) => void;
}

/**
 * Hook to handle authentication callbacks from URL (password reset, email confirmation)
 */
export const useAuthCallback = ({ setView }: UseAuthCallbackOptions) => {
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if URL contains auth token (Supabase sends it in hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          
          // Handle password reset
          if (window.location.pathname === '/reset-password' || (type === 'recovery' && accessToken)) {
            // If we have a recovery token in the URL, Supabase will handle it via auth state change
            // But we need to show the reset password view
            if (type === 'recovery' && accessToken) {
              setView(View.ResetPassword);
              // Clear the hash after detecting it (the component will handle the session)
              // Don't clear immediately - let Supabase process it first
            } else {
              // Check if we already have a session (user clicked link and Supabase created session)
              const { data } = await supabase.auth.getSession();
              if (data?.session) {
                setView(View.ResetPassword);
              }
            }
          }
          // Handle email confirmation
          else if (type === 'signup' && accessToken) {
            console.log('[useAuthCallback] Email confirmation callback detected');
            // Supabase will automatically process the token and create a session
            // The auth state change listener will detect the user and navigate to dashboard
            // Clear the hash from URL
            window.history.replaceState({}, '', window.location.pathname);
            // The user will be automatically logged in via onAuthStateChange
          }
        } catch (error) {
          console.error('[useAuthCallback] Error handling auth callback:', error);
        }
      } else {
        // In mock mode, just show the reset password view if needed
        if (window.location.pathname === '/reset-password' || (type === 'recovery' && accessToken)) {
          setView(View.ResetPassword);
        }
      }
    };

    handleAuthCallback();
  }, [setView]);
};

