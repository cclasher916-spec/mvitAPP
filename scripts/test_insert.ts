import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

async function test() {
    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase.from('platform_accounts').insert({ student_id: '00000000-0000-0000-0000-000000000000', platform: 'skillrack' as any, username: 'test' });
    console.log("Error inserting:", JSON.stringify(error));
    process.exit(0);
}

test();
