import { useEffect } from 'react';
import { UserTier, View } from '../types';
import { getUserProfile } from '../services/databaseService';

interface UseStripeCallbackOptions {
  user: { id: string } | null;
  authLoading: boolean;
  setUserTier: (tier: UserTier) => void;
  setRemainingFreeSessions: (count: number | null) => void;
  setView: (view: View) => void;
}

/**
 * Hook to handle Stripe checkout success redirect
 * Attempts to update tier directly via API, then falls back to polling
 */
export const useStripeCallback = ({
  user,
  authLoading,
  setUserTier,
  setRemainingFreeSessions,
  setView,
}: UseStripeCallbackOptions) => {
  useEffect(() => {
    if (!user || authLoading) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const plan = urlParams.get('plan');

    if (sessionId && plan) {
      console.log('[useStripeCallback] ✅ Stripe checkout success detected. Session:', sessionId, 'Plan:', plan);
      
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      
      // First, try to update tier directly via API (works even without webhooks)
      const updateTierDirectly = async () => {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
          console.log('[useStripeCallback] 🔄 Attempting to update tier directly from checkout session...');
          
          const response = await fetch(`${backendUrl}/api/update-tier-from-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to update tier' }));
            throw new Error(error.message || 'Failed to update tier');
          }

          const result = await response.json();
          console.log('[useStripeCallback] ✅ Tier updated successfully via direct API call:', result);
          
          // Update local state immediately
          setUserTier(UserTier.Premium);
          localStorage.setItem('mi-coach-tier', UserTier.Premium);
          setRemainingFreeSessions(null);
          
          // Show success and navigate to dashboard
          alert(`🎉 Payment successful! Your ${plan} subscription is now active. Enjoy unlimited practice sessions!`);
          setView(View.Dashboard);
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('[useStripeCallback] ⚠️ Direct tier update failed, falling back to polling:', errorMessage);
          console.warn('[useStripeCallback] Error details:', error);
          return false;
        }
      };

      // Refresh user tier from Supabase with enhanced retry logic (fallback)
      const refreshTierWithRetry = async () => {
        const maxRetries = 5;
        const initialDelay = 2000; // 2 seconds initial delay for webhook processing
        let retryCount = 0;
        let tierUpdated = false;

        console.log('[useStripeCallback] Starting tier refresh with retry logic (max', maxRetries, 'attempts)');

        while (retryCount < maxRetries && !tierUpdated) {
          try {
            if (retryCount === 0) {
              // Initial wait for webhook to process
              console.log('[useStripeCallback] ⏳ Waiting for webhook to process...');
              await new Promise(resolve => setTimeout(resolve, initialDelay));
            } else {
              // Exponential backoff: 2s, 4s, 8s, 16s
              const delayMs = initialDelay * Math.pow(2, retryCount - 1);
              console.log(`[useStripeCallback] 🔄 Retry attempt ${retryCount}/${maxRetries - 1}, waiting ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            console.log('[useStripeCallback] 📡 Fetching user profile for tier check...');
            const profile = await getUserProfile(user.id);
            
            if (profile && profile.tier === 'premium') {
              console.log('[useStripeCallback] ✅ Tier successfully updated to premium!');
              setUserTier(profile.tier as UserTier);
              localStorage.setItem('mi-coach-tier', profile.tier);
              setRemainingFreeSessions(null); // Clear free sessions limit immediately for premium users
              tierUpdated = true;
              
              // Show success and navigate to dashboard
              alert(`🎉 Payment successful! Your ${plan} subscription is now active. Enjoy unlimited practice sessions!`);
              setView(View.Dashboard);
            } else if (profile && profile.tier) {
              console.warn(`[useStripeCallback] ⏳ Tier still ${profile.tier} (expected premium). Retrying...`);
              retryCount++;
            } else {
              console.warn('[useStripeCallback] ⏳ No profile found or tier is empty. Retrying...');
              retryCount++;
            }
          } catch (error) {
            console.error('[useStripeCallback] ❌ Error refreshing tier:', error);
            retryCount++;
          }
        }

        // If tier wasn't updated after retries
        if (!tierUpdated) {
          console.warn(`[useStripeCallback] ⚠️  Tier was not updated after ${maxRetries} attempts`);
          console.warn('[useStripeCallback] Possible causes:');
          console.warn('  1. Backend server is not running (npm run dev:server)');
          console.warn('  2. Stripe CLI is not forwarding webhooks');
          console.warn('  3. Supabase credentials are missing or incorrect');
          console.warn('  4. Database connection failed');
          console.warn('[useStripeCallback] Action: Check server logs and run: curl http://localhost:3001/api/setup-check');
          
          alert('✅ Payment received! Your subscription is being activated.\n\n' +
                'If premium features don\'t appear after 30 seconds:\n' +
                '1. Refresh the page\n' +
                '2. Check that the backend server is running (npm run dev:server)\n' +
                '3. Verify Supabase credentials in .env.local');
          setView(View.Dashboard);
          
          // Still try to refresh tier from localStorage as fallback
          const savedTier = localStorage.getItem('mi-coach-tier') as UserTier;
          if (savedTier && Object.values(UserTier).includes(savedTier)) {
            setUserTier(savedTier);
          }
        }
      };

      // Try direct update first, then fall back to polling if needed
      (async () => {
        const directUpdateSuccess = await updateTierDirectly();
        if (!directUpdateSuccess) {
          refreshTierWithRetry();
        }
      })();
    }
  }, [user, authLoading, setUserTier, setRemainingFreeSessions, setView]);
};

