"use client"

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background font-sans">
          <div className="text-center space-y-4">
            <p className="text-8xl font-bold text-muted-foreground/20">500</p>
            <h1 className="text-2xl font-semibold">Server xatoligi</h1>
            <p className="text-muted-foreground max-w-sm">Kutilmagan xatolik yuz berdi. Iltimos qayta urinib ko'ring.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Qayta urinish
              </button>
              <a href="/dashboard" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                Bosh sahifa
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
