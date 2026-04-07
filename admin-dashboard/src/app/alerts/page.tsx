import { supabaseAdmin } from '@/lib/supabase'
import { AlertTriangle } from 'lucide-react'

export const revalidate = 60

export default async function AlertsPage() {
  // Fetch students who haven't solved anything recently
  const { data: leaderboard } = await supabaseAdmin.from('leaderboard_cache')
    .select('total_solved, student:students(name, roll_no, department:departments(code))')
    .eq('rank_type', 'college')
    .eq('period', 'weekly')
    .order('total_solved', { ascending: true })
    
  // Students with 0 solved this week
  const inactiveStudents = leaderboard?.filter(l => (l.total_solved || 0) === 0) || []

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Inactive Alerts</h1>
        <p className="text-slate-500 mt-2">Students who have not solved any problems this week.</p>
      </header>

      {inactiveStudents.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
            <AlertTriangle size={20} />
            <p className="font-semibold">{inactiveStudents.length} students need attention.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-sm border-b border-slate-100">
                  <th className="pb-3 font-medium px-4">Student Name</th>
                  <th className="pb-3 font-medium">Roll No</th>
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium text-right px-4">Weekly Score</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {inactiveStudents.map((l: any, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-medium">{l.student?.name || 'Unknown'}</td>
                    <td className="py-4 font-mono text-slate-500">{l.student?.roll_no}</td>
                    <td className="py-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-semibold">
                        {l.student?.department?.code || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-red-500">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl border border-emerald-100 text-center">
          <p className="font-semibold text-lg">All good! Every student is currently active.</p>
        </div>
      )}
    </div>
  )
}
