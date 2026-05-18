"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/errors"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    if (error instanceof ApiError && error.statusCode === 401) {
      router.replace("/restaurant/login")
    }
  }, [error, router])

  if (error instanceof ApiError) {
    if (error.statusCode === 401) return null
    if (error.statusCode === 403) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-xl font-semibold">Ruxsat yo'q</h2>
          <p className="mt-2 text-sm text-muted-foreground">Bu sahifaga kirishga huquqingiz yo'q.</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/restaurant")}>Bosh sahifaga</Button>
        </div>
      )
    }
    if (error.statusCode === 404) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-xl font-semibold">Topilmadi</h2>
          <p className="mt-2 text-sm text-muted-foreground">Siz qidirayotgan ma'lumot mavjud emas.</p>
          <Button className="mt-4" variant="outline" onClick={() => router.back()}>Orqaga</Button>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-semibold">Xatolik yuz berdi</h2>
      <p className="mt-2 text-sm text-muted-foreground">Serverga ulanishda muammo. Qayta urinib ko'ring.</p>
      <Button className="mt-4" onClick={reset}>Qayta yuklash</Button>
    </div>
  )
}
