"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { BellOff, BellRing, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { requestNotificationPermissionFromClick } from "@/hooks/use-fcm-token"
import {
  getInitialOrderSoundState,
  getOrderSoundState,
  ORDER_SOUND_CONTROL,
  stopOrderAlarm,
  subscribeOrderSound,
  testOrderSound,
  type OrderSoundStatus,
} from "@/lib/order-alarm"

/** Height of the banner, for pages sized to the viewport. */
const BANNER_HEIGHT_VAR = "--order-sound-banner"

/** These controls play the sound themselves; see ORDER_SOUND_CONTROL. */
const soundControl = { [ORDER_SOUND_CONTROL]: "" }

function useOrderSound() {
  return useSyncExternalStore(subscribeOrderSound, getOrderSoundState, getInitialOrderSoundState)
}

async function playTest() {
  // Same click: push permission is otherwise only asked on load, where the
  // browser often hides the prompt. Not awaited, so the sound test is not delayed.
  void requestNotificationPermissionFromClick()
  const result = await testOrderSound()
  if (result === "ok") {
    toast.success("Ovoz yoqildi", {
      description: "Eshitilmasa, qurilma ovozini va brauzerda shu sahifa (tab) ovozi o'chirilmaganini tekshiring.",
    })
  } else if (result === "fallback") {
    toast.warning("Sozlangan ovoz ochilmadi", { description: "Standart ovoz chalinmoqda." })
  } else if (result === "blocked") {
    toast.error("Brauzer ovozni blokladi", {
      description: PERMISSION_COPY.description,
    })
  } else if (result === "failed") {
    toast.error("Ovoz chalinmadi", { description: "Internetni tekshirib, qayta urinib ko'ring." })
  }
}

const COPY: Partial<Record<OrderSoundStatus, { title: string; description: string }>> = {
  blocked: {
    title: "Yangi buyurtma ovozi o'chiq",
    description: "Brauzer ovozga ruxsat bermadi. Tugmani bir marta bosing, aks holda yangi buyurtma ovozsiz keladi.",
  },
  failed: {
    title: "Yangi buyurtma ovozi ishlamayapti",
    description: "Ovoz fayli ochilmadi. Internetni tekshirib, qayta urinib ko'ring.",
  },
  unknown: {
    title: "Yangi buyurtma ovozi tekshirilmagan",
    description: "Ovoz ishlayotgani tasdiqlanmadi. Tugmani bosib, ovoz eshitilishini tekshiring.",
  },
}

/** A press of the button was refused too, so only a browser setting can help. */
const PERMISSION_COPY = {
  title: "Brauzer sozlamasida ovoz bloklangan",
  description: "Manzil satridagi belgini bosing, ovozga (Autoplay / Sound) ruxsat bering va sahifani yangilang.",
}

/**
 * Shown whenever the panel does not know for certain that a new order will be
 * heard. "Enabled" means playback really succeeded in this page.
 */
export function OrderSoundBanner() {
  const { status, waiting, needsPermission } = useOrderSound()
  const ref = useRef<HTMLDivElement>(null)
  const copy = needsPermission ? PERMISSION_COPY : COPY[status]
  const visible = copy !== undefined

  useEffect(() => {
    const el = ref.current
    if (!visible || !el) return
    const root = document.documentElement.style
    const publish = () => root.setProperty(BANNER_HEIGHT_VAR, `${el.offsetHeight}px`)
    publish()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish)
    observer?.observe(el)
    return () => {
      observer?.disconnect()
      root.removeProperty(BANNER_HEIGHT_VAR)
    }
  }, [visible])

  if (!copy) return null

  return (
    <div
      ref={ref}
      role="alert"
      // The button sits on the left on wide screens: order toasts cover the right.
      className="flex shrink-0 flex-col gap-2 bg-red-600 px-4 py-2.5 text-white sm:flex-row-reverse sm:items-center sm:justify-end sm:gap-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <VolumeX className="h-6 w-6 shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight">
            {waiting ? "Yangi buyurtma keldi, lekin ovoz chalinmadi!" : copy.title}
          </p>
          <p className="mt-0.5 text-sm leading-snug">{copy.description}</p>
        </div>
      </div>
      <Button
        {...soundControl}
        type="button"
        size="lg"
        onClick={playTest}
        className="h-11 w-full bg-white font-semibold text-red-700 hover:bg-red-50 focus-visible:ring-white/70 sm:w-auto"
      >
        <Volume2 className="h-5 w-5" aria-hidden="true" />
        Ovozni yoqish
      </Button>
    </div>
  )
}

/** Header control: test the configured sound, or stop the one that is playing. */
export function OrderSoundControl() {
  const { status, ringing, testing } = useOrderSound()

  if (ringing || testing) {
    return (
      <Button
        type="button"
        onClick={() => stopOrderAlarm()}
        className="bg-red-600 text-white hover:bg-red-700 motion-safe:animate-pulse"
        aria-label="Ovozni to'xtatish"
        title="Ovozni to'xtatish"
      >
        <BellOff className="h-4 w-4" aria-hidden="true" />
        {/* Icon only on phones: the market's visibility toggle shares this row. */}
        <span className="hidden sm:inline">Ovozni to&apos;xtatish</span>
      </Button>
    )
  }

  const enabled = status === "enabled"
  return (
    <Button
      {...soundControl}
      type="button"
      variant="outline"
      onClick={playTest}
      aria-label={enabled ? "Ovozni sinash. Ovoz yoqilgan" : "Ovozni sinash. Ovoz yoqilmagan"}
      title="Ovozni sinash"
      className={enabled ? "text-primary" : "border-red-300 text-red-600"}
    >
      {enabled
        ? <BellRing className="h-4 w-4" aria-hidden="true" />
        : <VolumeX className="h-4 w-4" aria-hidden="true" />}
      <span className="hidden sm:inline">Ovozni sinash</span>
    </Button>
  )
}
