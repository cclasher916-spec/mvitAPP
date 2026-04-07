import { supabaseAdmin } from '@/lib/supabase'
import { Users, Code2, Trophy, TrendingUp } from 'lucide-react'
import SyncButton from '@/components/SyncButton'

export const revalidate = 60 // Cache for 60 seconds

export default async function Home() {
  // Fetch real-time KPI data securely from server
  const { count: studentCount } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true })
  const { count: teamCount } = await supabaseAdmin.from('teams').select('*', { count: 'exact', head: true })
  
  // Best approximation of total activity via the global leaderboard cache (bypassing heavy daily delta aggregation)
  const { data: leaderboard } = await supabaseAdmin.from('leaderboard_cache')
    .select('total_solved, student:students(name, roll_no, department:departments(code))')
    .eq('rank_type', 'college')
    .eq('period', 'all_time')
    .order('rank', { ascending: true })

  const totalProblemsSolved = leaderboard?.reduce((acc, curr) => acc + (curr.total_solved || 0), 0) || 0;
  const activeStudents = leaderboard?.filter(l => (l.total_solved || 0) > 0).length || 0;

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Global Overview</h1>
          <p className="text-slate-500 mt-2">Welcome to the College-wide coding activity dashboard.</p>
        </div>
        <SyncButton />
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Students</p>
            <h3 className="text-2xl font-bold text-slate-800">{studentCount || 0}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center tracking-tight">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Coders</p>
            <h3 className="text-2xl font-bold text-slate-800">{activeStudents}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
            <Code2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Solved</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalProblemsSolved.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Teams Formed</p>
            <h3 className="text-2xl font-bold text-slate-800">{teamCount || 0}</h3>
          </div>
        </div>
      </div>

     {/* Preview Table */}
     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Top 10 Students College-Wide</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-slate-100">
                <th className="pb-3 font-medium px-4">Rank</th>
                <th className="pb-3 font-medium">Student Name</th>
                <th className="pb-3 font-medium">Roll No</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium text-right px-4">Total Score</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {leaderboard?.slice(0, 10).map((l: any, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-800">#{i + 1}</td>
                  <td className="py-4 font-medium">{l.student?.name || 'Unknown'}</td>
                  <td className="py-4 font-mono text-slate-500">{l.student?.roll_no}</td>
                  <td className="py-4">
                     <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-semibold">
                       {l.student?.department?.code || 'N/A'}
                     </span>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-indigo-600">{l.total_solved || 0}</td>
                </tr>
              ))}
              {!leaderboard || leaderboard.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-8 text-center text-slate-500">No ranking data available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
     </div>
    </div>
  )
}
