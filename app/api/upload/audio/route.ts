import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`

const MAX_AUDIO_BYTES = 3 * 1024 * 1024
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg"]
const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg"]

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("bm_access_token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()

  // The client checks these too, but posting straight to this route bypasses it.
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio fayl topilmadi" }, { status: 400 })
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio fayl hajmi 3 MB dan oshmasligi kerak" }, { status: 413 })
  }
  const lowerName = file.name.toLowerCase()
  if (
    !ALLOWED_AUDIO_TYPES.includes(file.type) &&
    !ALLOWED_AUDIO_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  ) {
    return NextResponse.json({ error: "Faqat MP3, WAV yoki OGG fayl yuklash mumkin" }, { status: 415 })
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}/upload/audio`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData as unknown as BodyInit,
    })
  } catch {
    return NextResponse.json({ error: "Serverga ulanib bo'lmadi" }, { status: 502 })
  }

  // Proxies return HTML on 413/502 and some errors have an empty body, so the
  // response is parsed defensively instead of assuming JSON.
  const raw = await response.text()
  let json: Record<string, unknown> | null = null
  try {
    json = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const message =
      (typeof json?.message === "string" && json.message) ||
      (typeof json?.error === "string" && json.error) ||
      (response.status === 413
        ? "Audio fayl hajmi juda katta"
        : `Audio faylni yuklashda xatolik (${response.status})`)
    return NextResponse.json({ error: message }, { status: response.status })
  }

  if (!json) {
    return NextResponse.json({ error: "Serverdan noto'g'ri javob keldi" }, { status: 502 })
  }

  return NextResponse.json(json.data ?? json)
}
