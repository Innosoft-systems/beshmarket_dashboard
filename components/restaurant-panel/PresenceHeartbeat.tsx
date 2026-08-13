"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { sendPresenceHeartbeatAction } from "@/lib/actions/restaurant-panel"

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
 */
export function PresenceHeartbeat() {
  const router = useRouter()
  const wasOpen = useRef<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    const beat = async () => {
      if (cancelled) return

      const result = await sendPresenceHeartbeatAction()
      if (cancelled || !result.success) return

      // Refresh once on the open→closed→open edge so the header badge and the
      // orders list catch up with the state the server just changed.
      const isOpen = result.isOpen ?? null
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
