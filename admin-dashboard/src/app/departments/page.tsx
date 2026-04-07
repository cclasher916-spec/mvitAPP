import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

export default async function DepartmentsPage() {
  const { data: departments } = await supabaseAdmin.from('departments').select('*').order('name')
  
  // Aggregate students per department
  const { data: students } = await supabaseAdmin.from('students').select('department_id')
  
  const deptCounts = departments?.map(d => ({
    ...d,
    studentCount: students?.filter(s => s.department_id === d.id).length || 0
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Departments</h1>
        <p className="text-slate-500 mt-2">Manage and view analytics by department.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-slate-100">
                <th className="pb-3 font-medium px-4">Department Code</th>
                <th className="pb-3 font-medium">Full Name</th>
                <th className="pb-3 font-medium text-right px-4">Enrolled Students</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {deptCounts?.map((d: any) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-indigo-600">{d.code}</td>
                  <td className="py-4 font-medium">{d.name}</td>
                  <td className="py-4 px-4 text-right font-bold">{d.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
