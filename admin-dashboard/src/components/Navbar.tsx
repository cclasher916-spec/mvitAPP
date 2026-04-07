import Link from 'next/link'
import { LayoutDashboard, Users, AlertTriangle, Download, CalendarDays } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white p-6 flex flex-col z-50">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-indigo-400">MVIT Tracker</h1>
        <p className="text-slate-400 text-sm mt-1">HOD Admin Panel</p>
      </div>

      <div className="flex flex-col gap-2 flex-grow">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
          <LayoutDashboard size={20} />
          <span className="font-medium">Overview</span>
        </Link>
        <Link href="/weekly" className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition-colors">
          <CalendarDays size={20} />
          <span className="font-medium">Weekly Report</span>
        </Link>
        <Link href="/departments" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
          <Users size={20} />
          <span className="font-medium">Departments</span>
        </Link>
        <Link href="/alerts" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
          <AlertTriangle size={20} />
          <span className="font-medium">Inactive Alerts</span>
        </Link>
      </div>
      
      <div className="mt-auto">
        <a href="/api/export-csv" className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors">
          <Download size={20} />
          <span className="font-medium">Export CSV</span>
        </a>
      </div>
    </nav>
  )
}
