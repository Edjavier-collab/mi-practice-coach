import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load environment variables from .env, .env.local, .env.[mode], .env.[mode].local
    const env = loadEnv(mode, process.cwd(), '');
    
    // Debug: Log if API keys are found (only in dev mode, and don't log the actual keys)
    if (mode === 'development') {
        const hasGeminiKey = !!(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY);
        console.log(`[Vite Config] GEMINI_API_KEY ${hasGeminiKey ? 'found' : 'NOT FOUND'}`);
        if (!hasGeminiKey) {
            console.warn('[Vite Config] Warning: GEMINI_API_KEY not found in environment variables');
        }

        const hasSupabaseUrl = !!env.VITE_SUPABASE_URL;
        const hasSupabaseAnonKey = !!env.VITE_SUPABASE_ANON_KEY;
        console.log(`[Vite Config] VITE_SUPABASE_URL ${hasSupabaseUrl ? 'found' : 'NOT FOUND'}`);
        console.log(`[Vite Config] VITE_SUPABASE_ANON_KEY ${hasSupabaseAnonKey ? 'found' : 'NOT FOUND'}`);
        if (!hasSupabaseUrl || !hasSupabaseAnonKey) {
            console.warn('[Vite Config] Warning: Supabase credentials not fully configured in environment variables');
        }
    }
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'import.meta.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
