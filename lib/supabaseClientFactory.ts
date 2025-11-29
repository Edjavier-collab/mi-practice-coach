import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './supabase';

/**
 * Singleton factory for Supabase client
 * Ensures only one instance is created and reused
 */
class SupabaseClientFactory {
  private static instance: SupabaseClient | null = null;

  /**
   * Get or create the Supabase client instance
   */
  static getClient(): SupabaseClient {
    if (!this.instance) {
      const url = getSupabaseUrl();
      const key = getSupabaseAnonKey();
      this.instance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 2,
          },
        },
        global: {
          headers: {
            'x-client-info': 'mi-practice-coach',
          },
        },
      });
    }
    return this.instance;
  }

  /**
   * Reset the client instance (useful for testing or reconfiguration)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Check if client is initialized
   */
  static isInitialized(): boolean {
    return this.instance !== null;
  }
}

export default SupabaseClientFactory;

