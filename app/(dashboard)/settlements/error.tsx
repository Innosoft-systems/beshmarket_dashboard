"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function SettlementsError({
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
      <p className="text-lg font-medium text-destructive">Hisob-kitoblarni yuklashda xatolik</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Qayta urinish</Button>
    </div>
  )
}
