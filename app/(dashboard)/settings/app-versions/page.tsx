import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { AppVersionsClient } from "@/components/settings/AppVersionsClient"
import type { AppVersion } from "@/lib/actions/app-versions"

export const metadata: Metadata = {
  title: "Ilova versiyalari | BeshMarket",
}

export default async function AppVersionsPage() {
  const token = await getAccessToken()

  try {
    const res = await apiRequest<AppVersion[]>("/app-versions", { accessToken: token })

    return <AppVersionsClient versions={res.data ?? []} />
  } catch {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Versiyalarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
