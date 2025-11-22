import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const userId = process.argv[2];

if (!userId) {
    console.error('Usage: node scripts/update-user-tier.js <userId>');
    process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function updateTier() {
    try {
        console.log(`Updating tier to premium for user: ${userId}`);
        
        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                tier: 'premium',
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select('*');
        
        if (error) {
            console.error('Error updating tier:', error);
            process.exit(1);
        }
        
        if (!data || data.length === 0) {
            console.error('No profile found for user:', userId);
            console.error('Please verify the user_id exists in the profiles table');
            process.exit(1);
        }
        
        console.log('✅ Successfully updated tier to premium!');
        console.log('User:', userId);
        console.log('New tier:', data[0].tier);
        console.log('Updated at:', data[0].updated_at);
        process.exit(0);
    } catch (error) {
        console.error('Failed to update tier:', error);
        process.exit(1);
    }
}

updateTier();

