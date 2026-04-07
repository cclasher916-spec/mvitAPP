import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE importing any module that uses them
config({ path: resolve(__dirname, '../.env') });

/**
 * Standalone script to manually run the daily sync job.
 * This script is idempotent - it can be run multiple times a day safely.
 * Run via: npx ts-node scripts/manual_sync.ts
 */
async function run() {
    console.log(`[${new Date().toISOString()}] Manual Sync Triggered`);
    console.log('Ensuring Supabase connection...');

    // Dynamic import so that scraper.service (and its supabase dependency)
    // is evaluated AFTER dotenv has loaded the environment variables.
    const { ScraperService } = await import('../services/scraper.service');

    try {
        await ScraperService.runDailySync();
        console.log(`[${new Date().toISOString()}] Manual Sync Completed Successfully`);
        process.exit(0);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Manual Sync Failed:`, error);
        process.exit(1);
    }
}

run();
