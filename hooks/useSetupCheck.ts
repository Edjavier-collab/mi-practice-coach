import { useEffect, useState } from 'react';

interface SetupCheckResult {
  timestamp: string;
  environment: string;
  stripe: {
    secretKeyConfigured: boolean;
    publishableKeyConfigured: boolean;
    priceIds: {
      monthly: string;
      annual: string;
    };
    webhookSecretConfigured: boolean;
  };
  supabase: {
    urlConfigured: boolean;
    serviceKeyConfigured: boolean;
    connectionTest?: string;
  };
  frontend: {
    backendUrlConfigured: boolean;
    backendUrlValue: string;
  };
}

interface UseSetupCheckOptions {
  backendUrl?: string;
  enabled?: boolean;
}

/**
 * Hook to check backend setup status
 * Useful for debugging payment and database issues
 */
export const useSetupCheck = (options: UseSetupCheckOptions = {}) => {
  const {
    backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
    enabled = false,
  } = options;

  const [setupCheck, setSetupCheck] = useState<SetupCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSetup = async () => {
    if (!enabled) {
      console.log('[useSetupCheck] Hook disabled, skipping check');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useSetupCheck] Running setup check against:', backendUrl);
      const response = await fetch(`${backendUrl}/api/setup-check`);
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as SetupCheckResult;
      setSetupCheck(data);
      console.log('[useSetupCheck] Setup check complete:', data);

      // Log any issues found
      if (!data.stripe.secretKeyConfigured) {
        console.warn('[useSetupCheck] ⚠️  Stripe secret key not configured');
      }
      if (!data.supabase.urlConfigured) {
        console.warn('[useSetupCheck] ⚠️  Supabase URL not configured');
      }
      if (data.supabase.connectionTest?.includes('❌')) {
        console.warn('[useSetupCheck] ⚠️  Supabase connection failed:', data.supabase.connectionTest);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useSetupCheck] Setup check failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Auto-check on mount if enabled
  useEffect(() => {
    if (enabled) {
      checkSetup();
    }
  }, [enabled]);

  return {
    setupCheck,
    loading,
    error,
    checkSetup,
    isHealthy: setupCheck && 
      setupCheck.stripe.secretKeyConfigured &&
      setupCheck.supabase.urlConfigured &&
      setupCheck.supabase.connectionTest?.includes('✅'),
  };
};

