import { createClient } from '@supabase/supabase-js';

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Get Supabase URL from environment variables
const getSupabaseUrl = (): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
        const errorMessage = 'VITE_SUPABASE_URL is required but not found. Please set it in your .env.local file.\n\n' +
            'Setup instructions:\n' +
            '1. Create a .env.local file in the project root directory\n' +
            '2. Add this line:\n' +
            '   VITE_SUPABASE_URL=your_supabase_project_url\n' +
            '3. Get your project URL from: https://app.supabase.com/project/_/settings/api\n' +
            '4. Restart your development server';
        
        if (isDevelopment) {
            console.warn('⚠️ [supabase] Supabase URL Missing:', errorMessage);
        }
        console.error('[supabase] Supabase URL check failed');
        throw new Error(errorMessage);
    }
    
    // Validate URL format
    const trimmedUrl = supabaseUrl.trim();
    if (!trimmedUrl || trimmedUrl.length === 0) {
        const errorMessage = 'VITE_SUPABASE_URL is set but appears to be empty. Please check your .env.local file.';
        if (isDevelopment) {
            console.warn('⚠️ [supabase] Invalid Supabase URL:', errorMessage);
        }
        throw new Error(errorMessage);
    }
    
    // Log status in development
    if (isDevelopment) {
        console.log('[supabase] Supabase URL found:', trimmedUrl);
    }
    
    return trimmedUrl;
};

// Get Supabase anonymous key from environment variables
const getSupabaseAnonKey = (): string => {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!anonKey) {
        const errorMessage = 'VITE_SUPABASE_ANON_KEY is required but not found. Please set it in your .env.local file.\n\n' +
            'Setup instructions:\n' +
            '1. Create a .env.local file in the project root directory\n' +
            '2. Add this line:\n' +
            '   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key\n' +
            '3. Get your anon key from: https://app.supabase.com/project/_/settings/api\n' +
            '4. Restart your development server';
        
        if (isDevelopment) {
            console.warn('⚠️ [supabase] Supabase Anon Key Missing:', errorMessage);
        }
        console.error('[supabase] Supabase anon key check failed');
        throw new Error(errorMessage);
    }
    
    // Validate key format
    const trimmedKey = anonKey.trim();
    if (!trimmedKey || trimmedKey.length === 0) {
        const errorMessage = 'VITE_SUPABASE_ANON_KEY is set but appears to be empty. Please check your .env.local file.';
        if (isDevelopment) {
            console.warn('⚠️ [supabase] Invalid Supabase Anon Key:', errorMessage);
        }
        throw new Error(errorMessage);
    }
    
    // Log status in development (only show prefix, never expose full key)
    if (isDevelopment) {
        console.log('[supabase] Supabase anon key found:', {
            hasKey: true,
            keyLength: trimmedKey.length,
            keyPrefix: `${trimmedKey.substring(0, 20)}...`
        });
    }
    
    return trimmedKey;
};

// Check if Supabase is configured (lazy check)
export const isSupabaseConfigured = (): boolean => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const hasUrl = !!(supabaseUrl && supabaseUrl.trim());
    const hasKey = !!(supabaseAnonKey && supabaseAnonKey.trim());
    
    return hasUrl && hasKey;
};

// Lazy initialization of Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;
let initializationAttempted = false;
let initializationError: Error | null = null;

// Get or initialize Supabase client (lazy initialization)
export const getSupabaseClient = () => {
    // If we've already tried and failed, throw the same error
    if (initializationAttempted && initializationError) {
        throw initializationError;
    }
    
    // If already initialized, return the client
    if (supabaseClient) {
        return supabaseClient;
    }
    
    // Mark that we're attempting initialization
    initializationAttempted = true;
    
    try {
        const supabaseUrl = getSupabaseUrl();
        const supabaseAnonKey = getSupabaseAnonKey();
        
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        
        if (isDevelopment) {
            console.log('[supabase] Supabase client initialized successfully');
        }
        
        return supabaseClient;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during Supabase initialization';
        console.error('[supabase] Failed to initialize Supabase client:', errorMessage);
        initializationError = error instanceof Error ? error : new Error(errorMessage);
        throw initializationError;
    }
};

// Export a getter proxy for backwards compatibility
// Usage: import { supabase } from '@/lib/supabase' will still work
// But it's better to use getSupabaseClient() or check isSupabaseConfigured() first
export { getSupabaseClient as supabase };

