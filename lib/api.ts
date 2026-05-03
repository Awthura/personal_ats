import type { GeneratedOutput } from './types'

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || ''

export function savePassword(pw: string) {
  localStorage.setItem('ats_pw', pw)
}

export function getPassword(): string | null {
  return localStorage.getItem('ats_pw')
}

export function clearPassword() {
  localStorage.removeItem('ats_pw')
}

export async function generateDocuments(jd: string): Promise<GeneratedOutput> {
  const password = getPassword()
  if (!password) throw new AuthError()

  const res = await fetch(`${WORKER_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jd, password }),
  })

  if (res.status === 401) {
    clearPassword()
    throw new AuthError()
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || 'Generation failed')
  }

  return res.json()
}

export class AuthError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'AuthError'
  }
}
