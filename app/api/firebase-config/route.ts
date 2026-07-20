import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const isComplete = Object.values(config).every(
    (value) => typeof value === 'string' && value.trim().length > 0,
  )

  if (!isComplete) {
    return NextResponse.json({ configured: false }, { status: 503 })
  }

  return NextResponse.json(config)
}
