"use client"

import { useRouter, usePathname } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const TYPE_ICONS: Record<string, string> = {
  new_order: "🛒",
  order_cancelled: "❌",
  new_review: "⭐",
  new_penalty: "⚠️",
  new_courier: "🚴",
}

const TYPE_LABELS: Record<string, string> = {
  new_order: "Yangi buyurtma",
  order_cancelled: "Bekor qilindi",
  new_review: "Yangi izoh",
  new_penalty: "Jarima",
  new_courier: "Yangi kuryer",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Hozirgina"
  if (m < 60) return `${m} daqiqa oldin`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} soat oldin`
  return new Date(iso).toLocaleDateString("uz")
}

interface Props {
  initialData: { data: any[]; total: number; pages: number }
  currentPage: number
}

export function NotificationsHistoryClient({ initialData, currentPage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = (p: number) => {
    startTransition(() => router.push(`/notifications?tab=history&page=${p}`))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Jami: {initialData.total} ta</span>
      </div>

      <div className="rounded-xl border overflow-hidden">
        {initialData.data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Bildirishnomalar yo'q</div>
        ) : (
          <div className="divide-y">
            {initialData.data.map((n: any) => (
              <div key={n._id} className={`flex items-start gap-3 px-5 py-4 ${!n.is_read ? "bg-blue-50/40" : ""}`}>
                <span className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{n.title}</span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">{TYPE_LABELS[n.type] || n.type}</Badge>
                    {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  {n.data?.link && (
                    <a href={n.data.link} className="text-xs text-primary hover:underline mt-1 inline-block">
                      Ko'rish →
                    </a>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/60 shrink-0 mt-1">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {initialData.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{currentPage}-sahifa / {initialData.pages}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1 || isPending} onClick={() => navigate(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" /> Oldingi
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= initialData.pages || isPending} onClick={() => navigate(currentPage + 1)}>
              Keyingi <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
