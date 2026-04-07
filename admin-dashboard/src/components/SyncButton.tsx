'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSync = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
        // Refresh page to show new data
        window.location.reload()
      } else {
        setStatus('error')
      }
    } catch (err) {
      setStatus('error')
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={status === 'loading'}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all shadow-sm ${
        status === 'loading' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
        status === 'success' ? 'bg-emerald-500 text-white' :
        status === 'error' ? 'bg-red-500 text-white' :
        'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95'
      }`}
    >
      {status === 'loading' ? (
        <>
          <RefreshCw size={18} className="animate-spin" />
          Syncing...
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle2 size={18} />
          Synced!
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle size={18} />
          Failed
        </>
      ) : (
        <>
          <RefreshCw size={18} />
          Sync Now
        </>
      )}
    </button>
  )
}
