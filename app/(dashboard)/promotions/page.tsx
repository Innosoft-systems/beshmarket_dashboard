import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { PromotionsClient } from "@/components/promotions/PromotionsClient"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Promo kodlar | BeshMarket" }

export default async function PromotionsPage() {
  const token = await getAccessToken()
  const [promoRes, meRes] = await Promise.all([
    apiRequest<any>("/promotions?limit=100", { accessToken: token }).catch(() => ({ data: { data: [] } })),
    apiRequest<any>("/auth/me", { accessToken: token }).catch(() => ({ data: null })),
  ])

  const promotions = promoRes.data?.data || promoRes.data || []
  const currentUserId = meRes.data?._id || ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Promo kodlar</h1>
        <p className="text-muted-foreground text-sm mt-1">Chegirma va aksiya kodlarini boshqarish</p>
      </div>
      <PromotionsClient promotions={promotions} currentUserId={currentUserId} />
    </div>
  )
}
