import 'dotenv/config'
import { ScraperService } from '../services/scraper.service'

async function main() {
    console.log('--- Daily Scraper Environment Check ---')
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Found' : '❌ Missing')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing')
    console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Found' : '⚪ Not Set')
    console.log('---------------------------------------')

    console.log('Starting daily scraper job...')
    await ScraperService.runDailySync()
    console.log('Daily scraper job finished.')
    process.exit(0)
}

main().catch(error => {
    console.error('Daily scraper failed:', error)
    process.exit(1)
})
