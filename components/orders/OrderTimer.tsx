"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface OrderTimerProps {
  createdAt: string
}

export function OrderTimer({ createdAt }: OrderTimerProps) {
  const [elapsed, setElapsed] = useState("")
  const [isLate, setIsLate] = useState(false)

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(createdAt).getTime()
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60)
        setElapsed(`${hours}s ${minutes % 60}d`)
      } else {
        setElapsed(`${minutes}:${seconds.toString().padStart(2, "0")}`)
      }

      setIsLate(minutes >= 5)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isLate ? "text-red-600" : "text-amber-600"}`}>
      <Clock className="h-4 w-4" />
      <span>{elapsed}</span>
    </div>
  )
}
