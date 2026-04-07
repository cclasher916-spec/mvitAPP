import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

async function checkCache() {
    const { supabase } = await import('../lib/supabase');

    // Check leaderboard_cache
    const { data, error } = await supabase
        .from('leaderboard_cache')
        .select(`
            rank,
            previous_rank,
            total_solved,
            streak,
            student_id,
            period,
            rank_type
        `)
        .limit(10);

    console.log("Error:", error);
    console.log("Data sample:", data);

    const { count } = await supabase.from('leaderboard_cache').select('*', { count: 'exact', head: true });
    console.log("Total cache rows:", count);

    process.exit(0);
}

checkCache();
