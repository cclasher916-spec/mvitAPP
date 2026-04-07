import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: leaderboard, error } = await supabaseAdmin
    .from('leaderboard_cache')
    .select(`
      rank,
      total_solved,
      streak,
      student:students(
        name,
        roll_no,
        batch,
        department:departments(code),
        platform_accounts(platform, username)
      )
    `)
    .eq('rank_type', 'college')
    .eq('period', 'all_time')
    .order('rank', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build CSV
  const headers = ['Rank', 'Name', 'Roll No', 'Department', 'Batch', 'Total Solved', 'Streak', 'LeetCode', 'CodeChef', 'HackerRank', 'GitHub', 'SkillRack']
  
  const rows = leaderboard?.map((l: any) => {
    const platforms: Record<string, string> = {}
    if (Array.isArray(l.student?.platform_accounts)) {
      l.student.platform_accounts.forEach((p: any) => {
        platforms[p.platform] = p.username || ''
      })
    }
    return [
      l.rank,
      `"${l.student?.name || ''}"`,
      l.student?.roll_no || '',
      l.student?.department?.code || '',
      l.student?.batch || '',
      l.total_solved || 0,
      l.streak || 0,
      platforms['leetcode'] || '',
      platforms['codechef'] || '',
      platforms['hackerrank'] || '',
      platforms['github'] || '',
      platforms['skillrack'] || '',
    ].join(',')
  }) || []

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().split('T')[0]

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="mvit-coding-report-${date}.csv"`,
    },
  })
}
