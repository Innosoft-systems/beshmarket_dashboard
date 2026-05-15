import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { SettingsCouriersClient } from "@/components/settings/SettingsCouriersClient"

export const metadata: Metadata = {
  title: "Kuryer sozlamalari | BeshMarket",
}

export default async function SettingsCouriersPage() {
  const token = await getAccessToken()

  try {
    const { data } = await apiRequest<any[]>("/settings", { accessToken: token })
    return <SettingsCouriersClient settings={data ?? []} />
  } catch {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Sozlamalarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
