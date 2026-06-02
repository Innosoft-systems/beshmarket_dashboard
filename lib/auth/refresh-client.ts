// Client-side token refresh — calls the /api/refresh route handler
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/refresh", { method: "POST" })
    if (!res.ok) return null
    const json = await res.json()
    return json.accessToken ?? null
  } catch {
    return null
  }
}
