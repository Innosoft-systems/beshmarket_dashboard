import type { Metadata } from "next"
import Link from "next/link"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import {
  BalanceTile,
  RestaurantBalancesChart,
  WalletMovementChart,
  type RestaurantBalance,
  type WalletChartPoint,
} from "@/components/charts/WalletCharts"

export const metadata: Metadata = { title: "Balanslar | BeshMarket" }

interface WalletsOverview {
  total_balance: number
  total_reserved: number
  total_available: number
  restaurants: (RestaurantBalance & { type?: string; commission_rate: number })[]
  chart: WalletChartPoint[]
}

const som = (value: number) => `${Math.round(value || 0).toLocaleString("uz-UZ")} so'm`

export default async function BalancesPage() {
  const token = await getAccessToken()

  const res = await apiRequest<WalletsOverview>("/restaurants/admin/wallets", {
    accessToken: token,
  }).catch(() => null)

  if (!res?.data) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
        Balanslarni yuklashda xatolik yuz berdi.
      </div>
    )
  }

  const overview = res.data
  const withBalance = overview.restaurants.filter(r => r.balance > 0).length

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Balanslar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Barcha restoran va do&apos;konlarning virtual hamyoni
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <BalanceTile
          label="Jami balans"
          value={overview.total_balance}
          hint={`${overview.restaurants.length} ta joydan ${withBalance} tasida mablag'  bor`}
          accent="credit"
        />
        <BalanceTile
          label="Band qilingan"
          value={overview.total_reserved}
          hint="Faol naqd buyurtmalar komissiyasi"
          accent="debit"
        />
        <BalanceTile
          label="Mavjud"
          value={overview.total_available}
          hint="Naqd buyurtma qabul qilish uchun"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <WalletMovementChart
          data={overview.chart}
          description="Oxirgi 6 oy — barcha joylar bo'yicha jami"
        />
        <RestaurantBalancesChart data={overview.restaurants} />
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Joylar bo&apos;yicha</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tranzaksiyalarni ko&apos;rish uchun nomni bosing
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Nomi</th>
                <th className="px-5 py-2.5 font-medium">Turi</th>
                <th className="px-5 py-2.5 text-right font-medium">Balans</th>
                <th className="px-5 py-2.5 text-right font-medium">Band</th>
                <th className="px-5 py-2.5 text-right font-medium">Mavjud</th>
                <th className="px-5 py-2.5 text-right font-medium">Komissiya</th>
              </tr>
            </thead>
            <tbody>
              {overview.restaurants.map(item => (
                <tr key={item._id} className="border-b last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/balances/${item._id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {item.type === "market" ? "Do'kon" : "Restoran"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{som(item.balance)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {som(item.reserved_balance)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {som(Math.max(0, item.balance - item.reserved_balance))}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {item.commission_rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
