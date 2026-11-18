"use client"

import { useState, useSyncExternalStore } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  getOrderAlarmSoundState,
  subscribeOrderAlarmSoundState,
  unlockOrderAlarm,
  type OrderAlarmSoundState,
} from "@/lib/order-alarm"
import { NOTIFICATION_PERMISSION_EVENT } from "@/hooks/use-fcm-token"

type Permission = NotificationPermission | "unsupported"

function readPermission(): Permission {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
}

const serverState = (): OrderAlarmSoundState => "unknown"

/**
 * A panel reopened after the browser was closed may not play sound until the
 * user clicks somewhere (Chrome's autoplay policy), so new orders arrive in
 * silence. When that is detected this bar asks for one click, which unlocks
 * the order alarm and, if not decided yet, asks for notification permission
 * (a click is what lets the browser show that prompt).
 */
export function SoundUnlockBanner() {
  const state = useSyncExternalStore(subscribeOrderAlarmSoundState, getOrderAlarmSoundState, serverState)
  // The bar only ever renders in the browser (the server snapshot is "unknown"),
  // so reading the permission here cannot cause a hydration mismatch.
  const [permission, setPermission] = useState<Permission>(readPermission)
  const [busy, setBusy] = useState(false)

  if (state !== "blocked") return null

  const enable = async () => {
    setBusy(true)
    try {
      const ok = await unlockOrderAlarm()
      if (permission === "default") {
        const next = await Notification.requestPermission().catch(() => readPermission())
        setPermission(next)
        if (next === "granted") window.dispatchEvent(new Event(NOTIFICATION_PERMISSION_EVENT))
      }
      if (ok) toast.success("Ovoz yoqildi")
      else toast.error("Ovozni yoqib bo'lmadi. Sahifaning istalgan joyini bosib ko'ring.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="flex items-start gap-2 text-sm">
        <VolumeX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Yangi buyurtma ovozi o&apos;chiq</p>
          <p className="text-xs opacity-90">
            Brauzer sahifa qayta ochilganda ovozni bloklaydi. Buyurtmalarni eshitish uchun bir marta bosing.
            {permission === "denied" &&
              " Bildirishnomalar ham o'chirilgan: manzil satridagi qulf belgisi orqali ruxsat bering."}
          </p>
        </div>
      </div>
      <Button size="sm" onClick={() => void enable()} disabled={busy} className="shrink-0 self-start sm:self-auto">
        <Volume2 className="h-4 w-4" /> Ovozni yoqish
      </Button>
    </div>
  )
}
