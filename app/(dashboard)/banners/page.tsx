import { Metadata } from "next"
import { getBanners } from "@/lib/api/banners"
import { BannersClient } from "@/components/banners/BannersClient"
import { getAccessToken } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Bannerlar | BeshMarket",
}

export default async function BannersPage() {
  const accessToken = await getAccessToken()

  try {
    const { data } = await getBanners(accessToken)
    return <BannersClient banners={data ?? []} />
  } catch {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Bannerlarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
