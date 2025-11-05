import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load environment variables from .env, .env.local, .env.[mode], .env.[mode].local
    const env = loadEnv(mode, process.cwd(), '');
    
    // Debug: Log if API key is found (only in dev mode, and don't log the actual key)
    if (mode === 'development') {
        const hasApiKey = !!(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY);
        console.log(`[Vite Config] GEMINI_API_KEY ${hasApiKey ? 'found' : 'NOT FOUND'}`);
        if (!hasApiKey) {
            console.warn('[Vite Config] Warning: GEMINI_API_KEY not found in environment variables');
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
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
