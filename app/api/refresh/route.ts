import { NextResponse } from "next/server"
import { getRefreshToken, setAuthTokens } from "@/lib/auth/session"

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`

export async function POST() {
  try {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 })
    }

    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Refresh failed" }, { status: 401 })
    }

    const json = await res.json()
    const tokens = json?.data ?? json

    if (!tokens?.accessToken || !tokens?.refreshToken) {
      return NextResponse.json({ error: "Invalid token response" }, { status: 401 })
    }

    await setAuthTokens(tokens.accessToken, tokens.refreshToken)
    return NextResponse.json({ accessToken: tokens.accessToken })
  } catch {
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 })
  }
}
