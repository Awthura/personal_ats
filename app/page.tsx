'use client'

import { useState } from 'react'
import JobInput from '@/components/JobInput'
import OutputPanel from '@/components/OutputPanel'
import Header from '@/components/Header'
import type { GeneratedOutput } from '@/lib/types'

export default function Dashboard() {
  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate(jd: string) {
    setLoading(true)
    setError('')
    setOutput(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setOutput(data)

      // Save to history in localStorage
      const history = JSON.parse(localStorage.getItem('ats_history') || '[]')
      history.unshift({ ...data, generated_at: new Date().toISOString(), jd_snippet: jd.slice(0, 120) })
      localStorage.setItem('ats_history', JSON.stringify(history.slice(0, 20)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <JobInput onGenerate={handleGenerate} loading={loading} />
          <OutputPanel output={output} loading={loading} error={error} />
        </div>
      </main>
    </div>
  )
}
