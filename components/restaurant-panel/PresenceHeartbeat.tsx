"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/** Comfortably inside the server's 2-minute window, so one lost beat is harmless. */
const HEARTBEAT_INTERVAL_MS = 30_000

/**
 * Tells the server the panel is still being watched.
 *
 * A venue whose panel is shut, asleep or offline cannot answer an order — it
 * would sit until the accept window lapses and auto-cancel, which reads to the
 * customer as the venue ignoring them. Missing heartbeats therefore close the
 * venue automatically, and the first beat after it comes back reopens it.
 *
 * Heartbeats continue while another browser tab is active. Switching tabs does
 * not mean the restaurant panel was closed; only closing this tab/window or
 * losing connectivity should stop beats and start the server's 2-minute timer.
 *
 * The beat goes to a route handler, not a Server Action: action ids are hashed
 * per build, so across a deploy a tab that is already open beats against an id
 * the new build does not have and the venue gets closed with nobody at fault.
 */
export function PresenceHeartbeat() {
  const router = useRouter()
  const wasOpen = useRef<boolean | null>(null)
  const instance = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const beat = async () => {
      if (cancelled) return

      let payload: { is_open?: boolean; instance?: string }
      try {
        const res = await fetch("/restaurant/presence", {
          method: "POST",
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) return
        payload = await res.json()
      } catch {
        // A dropped beat is survivable; the next one is 30s away and the
        // server's window is two minutes wide.
        return
      }
      if (cancelled) return

      // The server was redeployed under this tab. Its Server Action ids are now
      // stale, so the open/close button would fail silently too — reload once
      // to pick up the new build rather than sit here half-working.
      if (payload.instance) {
        if (instance.current && instance.current !== payload.instance) {
          window.location.reload()
          return
        }
        instance.current = payload.instance
      }

      // Refresh once on the open→closed→open edge so the header badge and the
      // orders list catch up with the state the server just changed.
      const isOpen = payload.is_open ?? null
      if (wasOpen.current !== null && wasOpen.current !== isOpen) {
        router.refresh()
      }
      wasOpen.current = isOpen
    }

    beat()
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS)
    // Browsers may throttle background timers. A beat on every visibility edge
    // keeps last_seen_at fresh when leaving/returning without treating a hidden
    // tab as closed. Restored connectivity also reports in immediately.
    document.addEventListener("visibilitychange", beat)
    window.addEventListener("online", beat)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", beat)
      window.removeEventListener("online", beat)
    }
  }, [router])

  return null
}
