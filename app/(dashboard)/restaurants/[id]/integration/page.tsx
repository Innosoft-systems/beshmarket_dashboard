import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ConnectionCard } from "@/components/integrations/ConnectionCard"
import type { Restaurant } from "@/types"
import type { IntegrationConnection, IntegrationStatus } from "@/types/integration"

export const metadata: Metadata = { title: "1C integratsiya | BeshMarket" }

/**
 * Per-venue 1C connection (admin only, v1). The data rendered here never
 * contains the secret: the connection read has no hash and the plain secret is
 * only returned to the client by the create / rotate actions.
 */
export default async function RestaurantIntegrationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const token = await getAccessToken()

  const [restaurantRes, connectionRes] = await Promise.all([
    apiRequest<Restaurant>(`/restaurants/admin/${encodeURIComponent(id)}`, { accessToken: token }).catch(() => null),
    apiRequest<IntegrationConnection | null>(
      `/integrations/1c/connections?restaurant_id=${encodeURIComponent(id)}`,
      { accessToken: token },
    ).catch(() => undefined),
  ])

  const connection = connectionRes?.data ?? null
  const statusRes = connection
    ? await apiRequest<IntegrationStatus>(
        `/integrations/1c/connections/${encodeURIComponent(connection._id)}/status`,
        { accessToken: token },
      ).catch(() => null)
    : null

  const back = (
    <Link
      href={`/restaurants/${id}`}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Restoran
    </Link>
  )

  if (!restaurantRes?.data) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          Restoran topilmadi yoki yuklashda xatolik yuz berdi.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {back}
      <div>
        <h1 className="text-2xl font-semibold">1C integratsiya</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{restaurantRes.data.name}</p>
      </div>

      {connectionRes === undefined ? (
        // Don't offer "create" when we simply could not read the current state.
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          1C ulanish ma&apos;lumotlarini yuklab bo&apos;lmadi. Sahifani keyinroq yangilang.
        </div>
      ) : (
        <ConnectionCard
          restaurantId={id}
          initialConnection={connection}
          initialStatus={statusRes?.data ?? null}
        />
      )}
    </div>
  )
}
