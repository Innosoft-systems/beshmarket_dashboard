import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("bm_access_token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()

  const response = await fetch(`${API_BASE}/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const json = await response.json()

  if (!response.ok) {
    return NextResponse.json(json, { status: response.status })
  }

  // Backend wraps responses in { success, data, timestamp } via TransformInterceptor;
  // unwrap so clients can access { url, filename, ... } directly.
  const payload = json?.data ?? json
  return NextResponse.json(payload)
}
