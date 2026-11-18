"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleMyRestaurantActiveAction } from "@/lib/actions/restaurant-panel"

/**
 * Shows or hides the venue in the customer app (`is_active`), for restaurants
 * and markets alike. Hidden means: not listed, not found, its page does not
 * open, and new orders are refused. Unlike "Yopish" (closed for now, still
 * listed), it is meant for taking the venue off the app.
 */
export function VenueVisibilityToggle({ isActive }: { isActive: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [active, setActive] = useState(isActive)

  const toggle = async () => {
    const next = !active
    setActive(next)
    const result = await toggleMyRestaurantActiveAction()
    if (result?.success === false) {
      setActive((prev) => !prev)
      toast.error(result.error || "Xatolik")
    } else {
      toast.success(next ? "Ilovada ko'rsatilmoqda" : "Ilovadan yashirildi: yangi buyurtma kelmaydi")
      startTransition(() => router.refresh())
    }
  }

  return (
    <Button
      onClick={toggle}
      disabled={isPending}
      size="sm"
      variant={active ? "default" : "outline"}
      className="gap-2"
      title={
        active
          ? "Mijozlar ilovasida ko'rinadi. Bossangiz, ilovadan yashiriladi va yangi buyurtma kelmaydi."
          : "Ilovadan yashirilgan. Bossangiz, mijozlarga yana ko'rinadi."
      }
      aria-label={active ? "Ilovada ko'rinmoqda: yashirish" : "Ilovadan yashirilgan: ko'rsatish"}
    >
      {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {isPending ? "..." : active ? "Ko'rinmoqda" : "Yashirilgan"}
    </Button>
  )
}
