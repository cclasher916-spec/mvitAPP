import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

async function checkDb() {
    const { supabase } = await import('../lib/supabase');

    // Check leaderboard_cache schema
    const { data: cacheRow } = await supabase.from('leaderboard_cache').select('*').limit(1);
    console.log('leaderboard_cache schema:', Object.keys(cacheRow?.[0] || {}));

    process.exit(0);
}

checkDb();
