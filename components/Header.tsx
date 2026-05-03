'use client'

import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
        <span className="font-semibold text-white">Personal ATS</span>
        <span className="text-gray-500 text-sm">— Aw Thura</span>
      </div>
      <button
        onClick={handleLogout}
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        Log out
      </button>
    </header>
  )
}
