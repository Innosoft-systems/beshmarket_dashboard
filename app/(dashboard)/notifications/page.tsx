import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { NotificationsClient } from "@/components/notifications/NotificationsClient"

export const metadata: Metadata = { title: "Bildirishnomalar | BeshMarket" }

export default async function NotificationsPage() {
  const token = await getAccessToken()

  const recentRes = await apiRequest<any>("/notifications?limit=10", { accessToken: token }).catch(
    () => ({ data: [] }),
  )

  const recent = Array.isArray(recentRes.data) ? recentRes.data : recentRes.data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Push bildirishnomalar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Barcha yoki tanlangan foydalanuvchilarga push xabar yuborish
        </p>
      </div>
      <NotificationsClient recentNotifications={recent} />
    </div>
  )
}
