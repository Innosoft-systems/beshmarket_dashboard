"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toggleMyRestaurantOpenAction } from "@/lib/actions/restaurant-panel"

export function RestaurantOverviewClient({ restaurant }: { restaurant: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const toggleOpen = async () => {
    const result = await toggleMyRestaurantOpenAction()
    if (result.success) {
      toast.success("Holat yangilandi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="outline" className={restaurant.is_open ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700"}>
        {restaurant.is_open ? "Ochiq" : "Yopiq"}
      </Badge>
      <Button onClick={toggleOpen} disabled={isPending} size="sm" variant="outline">
        <Power className="mr-2 h-4 w-4" />
        {restaurant.is_open ? "Yopish" : "Ochish"}
      </Button>
    </div>
  )
}
