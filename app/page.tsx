'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import JobInput from '@/components/JobInput'
import OutputPanel from '@/components/OutputPanel'
import Header from '@/components/Header'
import { generateDocuments, getPassword, AuthError } from '@/lib/api'
import type { GeneratedOutput } from '@/lib/types'

export default function Dashboard() {
  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!getPassword()) router.push('/login')
  }, [router])

  async function handleGenerate(jd: string) {
    setLoading(true)
    setError('')
    setOutput(null)

    try {
      const data = await generateDocuments(jd)
      setOutput(data)

      const history = JSON.parse(localStorage.getItem('ats_history') || '[]')
      history.unshift({ ...data, generated_at: new Date().toISOString(), jd_snippet: jd.slice(0, 120) })
      localStorage.setItem('ats_history', JSON.stringify(history.slice(0, 20)))
    } catch (err) {
      if (err instanceof AuthError) {
        router.push('/login')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
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
