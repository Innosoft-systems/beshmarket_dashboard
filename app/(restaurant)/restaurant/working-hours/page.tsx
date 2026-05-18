import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { WorkingHoursForm } from "@/components/restaurant-panel/WorkingHoursForm"

export default async function RestaurantWorkingHoursPage() {
  const token = await getAccessToken()

  let hours: any[] = []
  try {
    const { data } = await apiRequest<any[]>("/restaurants/my/working-hours", { accessToken: token })
    hours = data || []
  } catch (err) {
    if (!(err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403))) {
      throw err
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ish vaqti</h1>
        <p className="text-sm text-muted-foreground">Haftalik ochilish va yopilish vaqtlarini belgilang</p>
      </div>
      <WorkingHoursForm hours={hours} />
    </div>
  )
}
