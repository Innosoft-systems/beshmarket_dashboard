"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter()
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/20">Xatolik</p>
      <h2 className="text-xl font-semibold">Sahifani yuklashda xatolik</h2>
      <p className="text-muted-foreground text-sm max-w-sm">{error.message || "Kutilmagan xatolik yuz berdi."}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Qayta urinish
        </button>
        <button onClick={() => router.push("/dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
          Bosh sahifa
        </button>
      </div>
    </div>
  )
}
