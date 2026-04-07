import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Attempting skillrack insert...");
    const { data: d1, error: e1 } = await supabase.from('platform_accounts').insert({ student_id: '00000000-0000-0000-0000-000000000000', platform: 'skillrack', username: 'test' });
    console.log("Error inserting skillrack:", JSON.stringify(e1, null, 2));

    console.log("Attempting leetcode insert...");
    const { data: d2, error: e2 } = await supabase.from('platform_accounts').insert({ student_id: '00000000-0000-0000-0000-000000000000', platform: 'leetcode', username: 'test' });
    console.log("Error inserting leetcode:", JSON.stringify(e2, null, 2));

    process.exit(0);
}

test();
