import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { NotificationsClient } from "@/components/notifications/NotificationsClient"
import { NotificationsHistoryClient } from "@/components/notifications/NotificationsHistoryClient"

export const metadata: Metadata = { title: "Bildirishnomalar | BeshMarket" }

const VALID_TARGETS = ["all", "clients", "couriers"]

interface Props {
  searchParams: Promise<{ tab?: string; page?: string; target?: string }>
}

export default async function NotificationsPage({ searchParams }: Props) {
  const sp = await searchParams
  const tab = sp.tab === "history" ? "history" : "send"
  const page = sp.page ? +sp.page : 1
  const target = VALID_TARGETS.includes(sp.target ?? "") ? sp.target! : "all"

  const token = await getAccessToken()

  const historyRes = tab === "history"
    ? await apiRequest<any>(`/admin-notifications?page=${page}&limit=20`, { accessToken: token }).catch(() => ({ data: { data: [], total: 0, pages: 1 } }))
    : null

  const recentRes = await apiRequest<any>("/notifications?limit=5", { accessToken: token }).catch(() => ({ data: [] }))
  const recent = Array.isArray(recentRes.data) ? recentRes.data : recentRes.data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bildirishnomalar</h1>
        <p className="text-muted-foreground text-sm mt-1">Push xabar yuborish va bildirishnomalar tarixi</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { id: "send", label: "Xabar yuborish" },
          { id: "history", label: "Tarix" },
        ].map(t => (
          <a
            key={t.id}
            href={`/notifications?tab=${t.id}${target !== "all" ? `&target=${target}` : ""}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tab === "send" && <NotificationsClient recentNotifications={recent} />}
      {tab === "history" && historyRes && (
        <NotificationsHistoryClient
          initialData={historyRes.data}
          currentPage={page}
        />
      )}
    </div>
  )
}
