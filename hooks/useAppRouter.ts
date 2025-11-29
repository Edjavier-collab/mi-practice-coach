import { useEffect } from 'react';
import { View } from '../types';

interface UseAppRouterOptions {
  user: { id: string } | null;
  authLoading: boolean;
  view: View;
  setView: (view: View) => void;
}

/**
 * Hook to handle view routing based on authentication state
 * Navigates to dashboard when user logs in, allows anonymous access to free tier features
 */
export const useAppRouter = ({ user, authLoading, view, setView }: UseAppRouterOptions) => {
  useEffect(() => {
    if (authLoading) {
      return; // Don't change view while loading
    }

    if (user) {
      // User is logged in, navigate to dashboard if on login-related screens
      // But don't navigate away from reset password if they're in the middle of resetting
      if ((view === View.Login || view === View.ForgotPassword || view === View.EmailConfirmation) && view !== View.ResetPassword) {
        setView(View.Dashboard);
      }
    } else {
      // User is not logged in - allow anonymous access to free tier features
      // Only show login if on login/auth screens, otherwise allow Dashboard and other views
      if (view === View.Login || view === View.ForgotPassword || view === View.EmailConfirmation || view === View.ResetPassword) {
        // Already on auth screens, stay there
        return;
      }
      // Anonymous users can access Dashboard, Paywall (shows login prompt), Settings (shows sign up), and other free tier views
      // Only redirect premium-only views that require authentication
      if (view === View.Calendar || view === View.CoachingSummary || view === View.CancelSubscription) {
        // These views require login - redirect to dashboard
        setView(View.Dashboard);
      }
      // Note: PaywallView and SettingsView handle anonymous users by showing login/signup prompts
    }
  }, [user, authLoading, view, setView]);
};

