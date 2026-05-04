'use client'

import { useState } from 'react'
import type { GeneratedOutput } from '@/lib/types'

interface Props {
  output: GeneratedOutput | null
  loading: boolean
  error: string
}

type Tab = 'cv' | 'cl'

export default function OutputPanel({ output, loading, error }: Props) {
  const [tab, setTab] = useState<Tab>('cv')
  const [copied, setCopied] = useState<Tab | null>(null)

  function download(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.tex`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copy(content: string, which: Tab) {
    await navigator.clipboard.writeText(content)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] text-gray-500">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm">Generating tailored documents…</p>
        <p className="text-xs text-gray-600">This usually takes 15–30 seconds</p>
      </div>
    )
  }

  if (error === 'credits_exhausted') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-yellow-400 font-medium text-lg">API credits exhausted</p>
          <p className="text-sm text-gray-400">
            Your Anthropic API balance has run out. Top up at{' '}
            <span className="text-blue-400 font-mono text-xs">console.anthropic.com</span>
            {' '}then come back.
          </p>
          <p className="text-xs text-gray-600">Make sure auto top-up is off if you want manual control.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-red-400 font-medium">Generation failed</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-600 text-sm text-center space-y-2">
        <p className="text-2xl">📄</p>
        <p>Paste a job description and click Generate.</p>
        <p className="text-xs">CV and cover letter will appear here.</p>
      </div>
    )
  }

  const currentContent = tab === 'cv' ? output.cv_latex : output.cl_latex
  const currentFilename = tab === 'cv' ? output.filename_cv : output.filename_cl

  return (
    <div className="flex flex-col gap-4">
      {/* Meta info */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded text-xs font-medium">
          {output.language}
        </span>
        <span className="text-gray-300 text-sm font-medium">{output.role_title}</span>
        <span className="text-gray-500 text-sm">at {output.company}</span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {(['cv', 'cl'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'cv' ? 'CV / Resume' : 'Cover Letter'}
          </button>
        ))}
      </div>

      {/* Source code view */}
      <div className="relative">
        <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-[420px] font-mono whitespace-pre-wrap">
          {currentContent}
        </pre>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => download(currentContent, currentFilename)}
          className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          ↓ Download .tex
        </button>
        <button
          onClick={() => copy(currentContent, tab)}
          className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {copied === tab ? '✓ Copied!' : '⧉ Copy LaTeX'}
        </button>
      </div>

      {/* Compile hint */}
      <p className="text-xs text-gray-600">
        Compile: <code className="text-gray-500">pdflatex {currentFilename}.tex</code>
      </p>
    </div>
  )
}
