'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { savePassword, generateDocuments, AuthError } from '@/lib/api'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate by making a real call with a dummy JD
    savePassword(password)
    try {
      await generateDocuments('test')
    } catch (err) {
      if (err instanceof AuthError) {
        setError('Incorrect password.')
        setLoading(false)
        return
      }
      // Any non-auth error means the password was accepted
    }

    router.push('/')
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-80 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Personal ATS</h1>
          <p className="text-gray-400 text-sm mt-1">Enter password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
