import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  // Set NEXT_PUBLIC_BASE_PATH to your repo name if hosted at
  // https://username.github.io/repo-name (e.g. '/personal_ats')
  // Leave empty if using a custom domain at the root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
}

export default nextConfig
