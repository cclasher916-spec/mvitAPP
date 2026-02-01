# Daily Scraper Job Setup

## Overview
The daily scraper automatically fetches solved counts from all connected coding platforms and updates the database.

## Implementation Options

### Option 1: GitHub Actions (Recommended for MVP)

Create `.github/workflows/daily-sync.yml`:

```yaml
name: Daily Sync
on:
schedule:
- cron: '0 2 * * *'  # 2 AM UTC every day

jobs:
sync:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2
with:
node-version: '18'

- name: Install dependencies
run: npm install

- name: Run daily sync
env:
SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
run: npm run sync:daily
```

### Option 2: Supabase Edge Functions

Deploy a scheduled edge function that runs the sync.

### Option 3: AWS Lambda / Azure Functions

For production, deploy the scraper as a serverless function.

## API Limits

- **LeetCode**: No official API; using GraphQL with rate limiting
- **CodeChef**: Rate limited to 100 requests/minute
- **Codeforces**: Public API, rate limited
- **HackerRank**: Rate limited

## Error Handling

- Failed syncs are logged but don't block other students
- Retry mechanism for failed platforms
- Fallback to last known values

## Monitoring

Track sync status in Supabase:
- Check `platform_accounts.last_synced_at`
- Check `daily_activity.updated_at`
- Monitor error logs

## Manual Trigger

From mobile app admin panel:
```typescript
import ScraperService from './services/scraper.service'

// Trigger manual sync
await ScraperService.runDailySync()
```

## Performance

- Typical sync: 10-30 minutes for 700 students
- Parallel fetching: 4 concurrent platforms
- Database batch updates for efficiency
