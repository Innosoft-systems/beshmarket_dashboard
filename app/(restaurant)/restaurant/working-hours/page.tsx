import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { WorkingHoursForm } from "@/components/restaurant-panel/WorkingHoursForm"

export default async function RestaurantWorkingHoursPage() {
  const token = await getAccessToken()
  const { data: hours } = await apiRequest<any[]>("/restaurants/my/working-hours", { accessToken: token })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ish vaqti</h1>
        <p className="text-sm text-muted-foreground">Haftalik ochilish va yopilish vaqtlarini belgilang</p>
      </div>
      <WorkingHoursForm hours={hours || []} />
    </div>
  )
}
