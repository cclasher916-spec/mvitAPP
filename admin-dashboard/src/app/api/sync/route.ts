import { NextResponse } from 'next/server'
import { ScraperService } from '@/services/scraper.service'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('Initiating Manual Sync via Admin Dashboard...')
    
    // In a real production app, we'd use a background worker (like Vercel Cron or Inngest)
    // but for this college project, we'll run it inline for immediate feedback.
    await ScraperService.runDailySync()
    
    return NextResponse.json({ success: true, message: 'Sync completed successfully' })
  } catch (error: any) {
    console.error('Sync failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
