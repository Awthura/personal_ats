import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password !== process.env.ATS_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  const token = await new SignJWT({ sub: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('ats_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('ats_session')
  return response
}
