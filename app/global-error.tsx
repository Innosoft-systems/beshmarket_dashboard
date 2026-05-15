"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <html lang="uz">
      <body className="min-h-screen flex items-center justify-center bg-background font-sans">
        <div className="text-center space-y-4 p-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Kutilmagan xatolik yuz berdi
          </h2>
          <p className="text-muted-foreground">
            Iltimos, sahifani qayta yuklang yoki keyinroq urinib ko'ring.
          </p>
          <Button onClick={reset}>Qayta urinish</Button>
        </div>
      </body>
    </html>
  )
}
