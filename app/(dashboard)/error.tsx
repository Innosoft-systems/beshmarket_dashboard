"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[DashboardError]", error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Xatolik yuz berdi</h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button onClick={reset} variant="outline">Qayta urinish</Button>
      </div>
    </div>
  )
}
