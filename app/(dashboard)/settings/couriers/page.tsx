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
    const [settingsRes, legalRes] = await Promise.all([
      apiRequest<any[]>("/settings", { accessToken: token }),
      apiRequest<any[]>("/legal-pages/admin/all", { accessToken: token }).catch(() => ({ data: [], status: 200 })),
    ])

    return (
      <SettingsCouriersClient
        settings={settingsRes.data ?? []}
        legalPages={legalRes.data ?? []}
      />
    )
  } catch {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Sozlamalarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
