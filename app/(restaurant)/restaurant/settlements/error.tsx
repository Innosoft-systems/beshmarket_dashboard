"use client"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <p className="text-muted-foreground">{error.message || "Xatolik yuz berdi"}</p>
      <button onClick={reset} className="text-sm underline">Qayta urinish</button>
    </div>
  )
}
