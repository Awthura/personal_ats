'use client'

import { useState } from 'react'

interface Props {
  onGenerate: (jd: string) => void
  loading: boolean
}

export default function JobInput({ onGenerate, loading }: Props) {
  const [jd, setJd] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Job Description
        </h2>
        {jd && (
          <button
            onClick={() => setJd('')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job description here — title, requirements, company info, everything…"
        className="flex-1 min-h-[500px] lg:min-h-0 lg:h-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono"
      />

      <button
        onClick={() => onGenerate(jd)}
        disabled={!jd.trim() || loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
            Generating…
          </>
        ) : (
          '⚡ Generate CV + Cover Letter'
        )}
      </button>
    </div>
  )
}
