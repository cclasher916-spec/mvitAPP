import 'dotenv/config'
import { ScraperService } from '../services/scraper.service'

async function main() {
    console.log('Starting daily scraper job...')
    await ScraperService.runDailySync()
    console.log('Daily scraper job finished.')
    process.exit(0)
}

main().catch(error => {
    console.error('Daily scraper failed:', error)
    process.exit(1)
})
