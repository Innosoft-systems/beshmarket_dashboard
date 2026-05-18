"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toggleMyRestaurantOpenAction } from "@/lib/actions/restaurant-panel"

export function RestaurantOverviewClient({ restaurant }: { restaurant: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState<boolean>(restaurant.is_open)

  const toggleOpen = async () => {
    const nextValue = !isOpen
    setIsOpen(nextValue)
    const result = await toggleMyRestaurantOpenAction()
    if (result.success) {
      toast.success(nextValue ? "Restoran ochildi" : "Restoran yopildi")
      startTransition(() => router.refresh())
    } else {
      setIsOpen((prev) => !prev) // rollback
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
      <Button onClick={toggleOpen} disabled={isPending} size="sm" variant={isOpen ? "destructive" : "default"}>
        <Power className="mr-2 h-4 w-4" />
        {isPending ? "..." : isOpen ? "Yopish" : "Ochish"}
      </Button>
    </div>
  )
}
