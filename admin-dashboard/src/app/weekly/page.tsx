import { supabaseAdmin } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 60

export default async function WeeklyReportPage() {
  const { data: weekly } = await supabaseAdmin
    .from('leaderboard_cache')
    .select(`
      rank,
      total_solved,
      streak,
      student:students(name, roll_no, department:departments(code))
    `)
    .eq('rank_type', 'college')
    .eq('period', 'weekly')
    .order('total_solved', { ascending: false })
    .limit(50)

  const { data: daily } = await supabaseAdmin
    .from('leaderboard_cache')
    .select('total_solved')
    .eq('rank_type', 'college')
    .eq('period', 'daily')

  const totalWeekly = weekly?.reduce((acc, l) => acc + (l.total_solved || 0), 0) || 0
  const totalToday = daily?.reduce((acc, l) => acc + (l.total_solved || 0), 0) || 0
  const activeSolvers = weekly?.filter(l => (l.total_solved || 0) > 0).length || 0
  const topStreak = weekly?.reduce((max, l) => Math.max(max, l.streak || 0), 0) || 0

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Weekly Report</h1>
          <p className="text-slate-500 mt-1">{today}</p>
        </div>
        <a
          href="/api/export-csv"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          <Download size={18} />
          Export to CSV
        </a>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-indigo-600 text-white p-6 rounded-2xl">
          <p className="text-indigo-200 text-sm font-medium mb-1">Problems This Week</p>
          <p className="text-3xl font-bold">{totalWeekly.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Solved Today</p>
          <p className="text-3xl font-bold text-slate-800">{totalToday.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Active Students</p>
          <p className="text-3xl font-bold text-slate-800">{activeSolvers}</p>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Longest Streak</p>
          <p className="text-3xl font-bold text-slate-800">🔥 {topStreak} days</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">This Week&apos;s Top Performers</h2>
          <span className="text-sm text-slate-500">{weekly?.length || 0} ranked students</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="pb-3 font-medium px-2">Rank</th>
                <th className="pb-3 font-medium">Student</th>
                <th className="pb-3 font-medium">Roll No</th>
                <th className="pb-3 font-medium">Dept</th>
                <th className="pb-3 font-medium text-center">Streak</th>
                <th className="pb-3 font-medium text-right px-2">Weekly Score</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {weekly?.map((l: any, i) => (
                <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i < 3 ? 'bg-amber-50/30' : ''}`}>
                  <td className="py-3 px-2 font-bold text-slate-500">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td className="py-3 font-semibold text-slate-800">{l.student?.name || '—'}</td>
                  <td className="py-3 font-mono text-slate-400 text-xs">{l.student?.roll_no}</td>
                  <td className="py-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold">
                      {l.student?.department?.code || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 text-center text-orange-500 font-bold">
                    {(l.streak || 0) > 0 ? `🔥${l.streak}` : '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-indigo-600 text-base">
                    {l.total_solved || 0}
                  </td>
                </tr>
              ))}
              {(!weekly || weekly.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No activity data recorded for this week.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
