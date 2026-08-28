"use client"

import { getFullImgUrl } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RestaurantWalletPanel, type WalletData } from "./RestaurantWalletPanel"
import { RestaurantOrdersPanel } from "./RestaurantOrdersPanel"
import type { Restaurant } from "@/types"
import type { Order } from "@/types/order"

interface Props {
  restaurant: Restaurant
  wallet: WalletData | null
  orders: { data: Order[]; pagination: { totalPages: number; total: number } }
}

const som = (value?: number) =>
  `${Math.round(Number(value) || 0).toLocaleString("uz-UZ")} so'm`

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("uz-UZ", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b py-2.5 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value || "—"}</dd>
    </div>
  )
}

export function RestaurantDetailClient({ restaurant, wallet, orders }: Props) {
  const owner =
    restaurant.owner_id && typeof restaurant.owner_id === "object"
      ? restaurant.owner_id
      : null
  const logo = restaurant.logo ? getFullImgUrl(restaurant.logo) : null
  const hasCoords =
    typeof restaurant.lat === "number" && typeof restaurant.lng === "number"

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-start gap-4">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl border object-cover"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border bg-muted text-lg font-semibold text-muted-foreground">
            {restaurant.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {restaurant.type === "market" ? "Do'kon" : "Restoran"} · {restaurant.city},{" "}
            {restaurant.district}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <Badge tone={restaurant.is_active ? "good" : "muted"}>
              {restaurant.is_active ? "Faol" : "Nofaol"}
            </Badge>
            <Badge tone={restaurant.is_open ? "good" : "muted"}>
              {restaurant.is_open ? "Ochiq" : "Yopiq"}
            </Badge>
            <Badge tone={restaurant.status === "approved" ? "good" : "warn"}>
              {restaurant.status === "approved" ? "Tasdiqlangan" : restaurant.status}
            </Badge>
            {!hasCoords && <Badge tone="warn">Koordinata yo&apos;q</Badge>}
          </div>
        </div>
      </header>

      <Tabs defaultValue="info">
        <TabsList className="mb-5">
          <TabsTrigger value="info">Ma&apos;lumot</TabsTrigger>
          <TabsTrigger value="wallet">Balans</TabsTrigger>
          <TabsTrigger value="orders">Buyurtmalar</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold">Asosiy</h2>
              <dl>
                <Field label="Nomi" value={restaurant.name} />
                <Field label="Slug" value={restaurant.slug} />
                <Field label="Turi" value={restaurant.type === "market" ? "Do'kon" : "Restoran"} />
                <Field label="Telefon" value={restaurant.phone} />
                <Field label="Manzil" value={restaurant.address} />
                <Field label="Shahar / tuman" value={`${restaurant.city} · ${restaurant.district}`} />
                <Field
                  label="Koordinata"
                  value={
                    hasCoords ? (
                      `${restaurant.lat}, ${restaurant.lng}`
                    ) : (
                      <span className="text-amber-600">
                        Kiritilmagan — joylashuvi yoqilgan foydalanuvchilarga ko&apos;rinmaydi
                      </span>
                    )
                  }
                />
                <Field label="Tavsif" value={restaurant.description} />
              </dl>
            </section>

            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold">Egasi va shartlar</h2>
              <dl>
                <Field label="Panel logini" value={owner?.username} />
                <Field label="Egasining telefoni" value={owner?.phone} />
                <Field label="Komissiya" value={`${restaurant.commission_rate ?? 0}%`} />
                <Field label="Minimal buyurtma" value={som(restaurant.min_order_amount)} />
                <Field label="O'rtacha tayyorlash" value={`${restaurant.avg_prep_time ?? 0} daqiqa`} />
                <Field
                  label="Reyting"
                  value={`${(restaurant.avg_rating ?? 0).toFixed(1)} ★`}
                />
                <Field label="Tartib raqami" value={String(restaurant.order ?? 0)} />
                <Field
                  label="Oxirgi faollik"
                  value={
                    <>
                      {formatDate(restaurant.last_seen_at)}
                      {restaurant.auto_closed && (
                        <span className="ml-2 text-xs text-amber-600">
                          (avtomatik yopilgan)
                        </span>
                      )}
                    </>
                  }
                />
              </dl>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="wallet">
          {wallet ? (
            <RestaurantWalletPanel wallet={wallet} />
          ) : (
            <div className="rounded-xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
              Balansni yuklab bo&apos;lmadi
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          <RestaurantOrdersPanel restaurantId={restaurant._id} initial={orders} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Badge({
  tone,
  children,
}: {
  tone: "good" | "warn" | "muted"
  children: React.ReactNode
}) {
  const tones = {
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    muted: "bg-muted text-muted-foreground",
  }
  return <span className={`rounded-md px-2 py-0.5 ${tones[tone]}`}>{children}</span>
}
