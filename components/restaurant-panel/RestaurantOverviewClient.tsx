"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { setMyRestaurantOpenAction } from "@/lib/actions/restaurant-panel"

export function RestaurantOverviewClient({ restaurant }: { restaurant: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState<boolean>(restaurant.is_open)
  const [saving, setSaving] = useState(false)

  // The server prop is the truth; a heartbeat or the presence sweep can change
  // it underneath us, and the badge has to follow or the next press will be
  // aimed at a state that no longer exists.
  useEffect(() => {
    setIsOpen(restaurant.is_open)
  }, [restaurant.is_open])

  const toggleOpen = async () => {
    if (saving) return

    const nextValue = !isOpen
    setSaving(true)
    setIsOpen(nextValue)

    const result = await setMyRestaurantOpenAction(nextValue)
    setSaving(false)

    if (result.success) {
      toast.success(nextValue ? "Restoran ochildi" : "Restoran yopildi")
      startTransition(() => router.refresh())
    } else {
      setIsOpen(restaurant.is_open)
      toast.error(result.error)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge
        variant="outline"
        className={isOpen
          ? "bg-green-100 text-green-700 border-green-200"
          : "bg-gray-100 text-gray-700 border-gray-200"}
      >
        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${isOpen ? "bg-green-500" : "bg-gray-400"}`} />
        {isOpen ? "Ochiq" : "Yopiq"}
      </Badge>
      {/* Say why it closed — otherwise the owner reads it as the panel losing
          their setting rather than the system reacting to them being offline. */}
      {!isOpen && restaurant.auto_closed && (
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          Panel aloqasi uzilgani uchun avtomatik yopildi
        </span>
      )}
      <Button onClick={toggleOpen} disabled={saving || isPending} size="sm" variant={isOpen ? "destructive" : "default"}>
        <Power className="mr-2 h-4 w-4" />
        {saving || isPending ? "..." : isOpen ? "Yopish" : "Ochish"}
      </Button>
    </div>
  )
}
