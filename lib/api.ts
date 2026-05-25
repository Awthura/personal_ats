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

export async function validatePassword(password: string): Promise<boolean> {
  const res = await fetch(`${WORKER_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res.ok
}

export async function generateDocuments(jd: string, includeCL = true): Promise<GeneratedOutput> {
  const password = getPassword()
  if (!password) throw new AuthError()

  const res = await fetch(`${WORKER_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jd, password, include_cl: includeCL }),
  })

  if (res.status === 401) {
    clearPassword()
    throw new AuthError()
  }

  if (res.status === 402) {
    throw new Error('credits_exhausted')
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const data = await res.json()
      message = (data as { error?: string }).error || message
    } catch {
      const text = await res.text().catch(() => '')
      message = `HTTP ${res.status}: ${text.slice(0, 300) || 'empty response'}`
    }
    throw new Error(message)
  }

  return res.json()
}

export async function compileToPdf(latex: string, filename: string): Promise<void> {
  const password = getPassword()
  if (!password) throw new AuthError()

  const res = await fetch(`${WORKER_URL}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latex, password }),
  })

  if (res.status === 401) { clearPassword(); throw new AuthError() }
  if (!res.ok) throw new Error('PDF compilation failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export class AuthError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'AuthError'
  }
}
