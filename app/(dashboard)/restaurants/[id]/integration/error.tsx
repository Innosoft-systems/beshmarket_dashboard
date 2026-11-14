"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function RestaurantIntegrationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-lg font-medium text-destructive">1C integratsiya sahifasini yuklashda xatolik</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Qayta urinish</Button>
    </div>
  )
}
