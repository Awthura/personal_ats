'use client'

import { useState, useEffect } from 'react'
import type { GeneratedOutput } from '@/lib/types'
import { compileToPdf, AuthError } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface Props {
  output: GeneratedOutput | null
  loading: boolean
  error: string
}

type Tab = 'cv' | 'cl'

export default function OutputPanel({ output, loading, error }: Props) {
  const [tab, setTab] = useState<Tab>('cv')
  const [copied, setCopied] = useState<Tab | null>(null)

  useEffect(() => {
    if (output) setTab(output.cv_latex ? 'cv' : 'cl')
  }, [output])
  const [compiling, setCompiling] = useState<Tab | null>(null)
  const [compileError, setCompileError] = useState('')
  const router = useRouter()

  const hasCL = !!output?.cl_latex

  function downloadTex(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.tex`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadPdf(content: string, filename: string, which: Tab) {
    setCompiling(which)
    setCompileError('')
    try {
      await compileToPdf(content, filename)
    } catch (err) {
      if (err instanceof AuthError) {
        router.push('/login')
        return
      }
      downloadTex(content, filename)
      setCompileError('PDF compilation failed — .tex downloaded. Run: pdflatex ' + filename + '.tex')
    } finally {
      setCompiling(null)
    }
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

  const currentContent = tab === 'cv' ? output.cv_latex : (output.cl_latex ?? '')
  const currentFilename = tab === 'cv' ? output.filename_cv : (output.filename_cl ?? '')
  const isCompilingThis = compiling === tab

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
        <button
          onClick={() => setTab('cv')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === 'cv' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          CV / Resume
        </button>
        {hasCL && (
          <button
            onClick={() => setTab('cl')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'cl' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Cover Letter
          </button>
        )}
      </div>

      {/* Source code view */}
      <div className="relative">
        <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-[380px] font-mono whitespace-pre-wrap">
          {currentContent}
        </pre>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => downloadPdf(currentContent, currentFilename, tab)}
          disabled={isCompilingThis}
          className="py-2.5 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          {isCompilingThis ? (
            <><span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-white rounded-full animate-spin" /> Compiling…</>
          ) : '↓ PDF'}
        </button>
        <button
          onClick={() => downloadTex(currentContent, currentFilename)}
          className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          ↓ .tex
        </button>
        <button
          onClick={() => copy(currentContent, tab)}
          className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {copied === tab ? '✓ Copied' : '⧉ Copy'}
        </button>
      </div>

      {compileError && <p className="text-xs text-yellow-500">{compileError}</p>}
    </div>
  )
}
