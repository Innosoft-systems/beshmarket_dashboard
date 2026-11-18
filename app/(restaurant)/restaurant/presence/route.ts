import { NextResponse } from "next/server"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { isExpired } from "@/lib/auth/token"

/**
 * The panel's presence beat.
 *
 * This is a route handler rather than a Server Action on purpose. Action ids are
 * hashed per build, so a panel left open across a deploy keeps calling an id the
 * new build does not have: every beat fails with "Failed to find Server Action",
 * the venue misses its window, the sweep closes it, and nothing recovers until
 * somebody reloads the tab. A route path is the same string in every build.
 *
 * The path stays under /restaurant (tabs left open across a deploy keep beating
 * it), but the middleware does not refresh tokens for it: a beat fired together
 * with the sockets' refresh raced them with the same refresh token and logged
 * the venue out. A stale token gets a 401 here; the panel then refreshes
 * through its shared, cross-tab client refresh and beats again.
 */

// A fresh value per server process, so a new deployment — or a restart — is
// visible to a tab that is already open. The panel reloads itself when it
// changes, which is also what rescues the Server Actions behind its buttons.
const INSTANCE = Date.now().toString(36)

export const dynamic = "force-dynamic"

export async function POST() {
  const token = await getAccessToken()
  if (!token || isExpired(token)) {
    return NextResponse.json({ error: "Avtorizatsiya" }, { status: 401 })
  }

  try {
    const res = await apiRequest<{ is_open: boolean }>("/restaurants/my/heartbeat", {
      method: "POST",
      accessToken: token,
    })
    return NextResponse.json({
      is_open: res.data?.is_open ?? false,
      instance: INSTANCE,
    })
  } catch (e: unknown) {
    const status = e instanceof ApiError ? e.statusCode : 502
    const error = e instanceof ApiError ? e.message : "Xatolik yuz berdi"
    return NextResponse.json({ error }, { status })
  }
}
