"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleMyRestaurantActiveAction } from "@/lib/actions/restaurant-panel"

export function MarketVisibilityToggle({ isActive }: { isActive: boolean }) {
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
      toast.success(next ? "Bosh sahifada ko'rsatilmoqda" : "Bosh sahifadan yashirildi")
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
    >
      {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {isPending ? "..." : active ? "Ko'rinmoqda" : "Yashirilgan"}
    </Button>
  )
}
