import type { Metadata } from "next"
import Link from "next/link"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import {
  DailyGmvChart,
  IncomeBreakdownChart,
  IncomeVsCostChart,
  PaymentMethodChart,
  StatTile,
  StatusChart,
  TopVenuesChart,
  som,
  monthLabel,
  type NamedRow,
  type PaymentRow,
  type PeriodRow,
  type StatusRow,
} from "@/components/charts/FinanceCharts"

export const metadata: Metadata = { title: "Statistika | BeshMarket" }

interface Bucket {
  gmv: number
  subtotal: number
  commission: number
  service_fee: number
  delivery_fee: number
  courier_payout: number
  discount: number
  orders: number
  restaurant_earnings: number
  delivery_margin: number
  platform_net: number
  avg_check: number
  take_rate: number
}

interface Financials {
  all_time: Bucket
  today: Bucket
  last_30: Bucket
  prev_30: Bucket
  growth: { gmv: number; orders: number; platform_net: number }
  cancelled_30: { orders: number; lost: number }
  daily: PeriodRow[]
  monthly: PeriodRow[]
  by_payment: (PaymentRow & Bucket)[]
  by_status: StatusRow[]
  top_venues: (NamedRow & Bucket & { _id: string; type: string })[]
}

export default async function StatisticsPage() {
  const token = await getAccessToken()
  const res = await apiRequest<Financials>("/orders/stats/financials", {
    accessToken: token,
  }).catch(() => null)

  if (!res?.data) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
        Statistikani yuklashda xatolik yuz berdi.
      </div>
    )
  }

  const f = res.data
  const m = f.last_30

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Statistika</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Yetkazilgan buyurtmalar bo&apos;yicha. Har bir summa buyurtma qaysi tomonga
          tegishli ekaniga qarab ajratilgan — pulni kim jismonan ushlaganiga emas.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Aylanma (30 kun)"
          value={som(m.gmv)}
          growth={f.growth.gmv}
          hint="mijozlar to'lagan"
          accent="income"
        />
        <StatTile
          label="Platforma daromadi (30 kun)"
          value={som(m.platform_net)}
          growth={f.growth.platform_net}
          hint={`aylanmaning ${m.take_rate}%`}
          accent="third"
        />
        <StatTile
          label="Buyurtmalar (30 kun)"
          value={`${m.orders} ta`}
          growth={f.growth.orders}
          hint={`o'rtacha chek ${som(m.avg_check)}`}
        />
        <StatTile
          label="Bekor qilingan (30 kun)"
          value={`${f.cancelled_30.orders} ta`}
          hint={`${som(f.cancelled_30.lost)} amalga oshmadi`}
          accent="cost"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <IncomeVsCostChart data={f.monthly} />
        <IncomeBreakdownChart data={f.monthly} />
      </section>

      <DailyGmvChart data={f.daily} />

      <section className="grid gap-4 lg:grid-cols-2">
        <PaymentMethodChart data={f.by_payment} />
        <StatusChart data={f.by_status} />
      </section>

      <TopVenuesChart data={f.top_venues} />

      <FlowTable label="Oxirgi 30 kun" bucket={m} />
      <FlowTable label="Butun davr" bucket={f.all_time} />

      <MonthlyTable rows={f.monthly} />
      <VenueTable rows={f.top_venues} />
    </div>
  )
}

/** Where the money in one bucket went, line by line. */
function FlowTable({ label, bucket }: { label: string; bucket: Bucket }) {
  const income = bucket.commission + bucket.service_fee + bucket.delivery_fee
  const cost = bucket.courier_payout + bucket.discount

  const rows: { name: string; value: number; note: string; tone?: "in" | "out" | "net" }[] = [
    { name: "Aylanma (mijozlar to'lagan)", value: bucket.gmv, note: "subtotal + yetkazish + servis − chegirma" },
    { name: "Mahsulotlar summasi", value: bucket.subtotal, note: "restoran bergan tovar" },
    { name: "Restoranlarga", value: bucket.restaurant_earnings, note: "mahsulotlar summasi − komissiya", tone: "out" },
    { name: "Komissiya", value: bucket.commission, note: "restorandan olingan", tone: "in" },
    { name: "Servis haqi", value: bucket.service_fee, note: "mijozdan olingan", tone: "in" },
    { name: "Yetkazish haqi", value: bucket.delivery_fee, note: "mijozdan olingan", tone: "in" },
    { name: "Kuryerlarga", value: bucket.courier_payout, note: "yetkazish to'lovi + bonus", tone: "out" },
    { name: "Chegirmalar", value: bucket.discount, note: "promo — platforma hisobidan", tone: "out" },
    { name: "Yetkazish marjasi", value: bucket.delivery_margin, note: "yetkazish haqi − kuryer to'lovi" },
    { name: "Jami kirim", value: income, note: "komissiya + servis + yetkazish", tone: "in" },
    { name: "Jami chiqim", value: cost, note: "kuryer + chegirma", tone: "out" },
    { name: "Platforma daromadi", value: bucket.platform_net, note: "kirim − chiqim", tone: "net" },
  ]

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">Pul oqimi — {label}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {bucket.orders} ta yetkazilgan buyurtma
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(row => (
              <tr
                key={row.name}
                className={`border-b last:border-0 ${row.tone === "net" ? "bg-muted/40 font-semibold" : ""}`}
              >
                <td className="px-5 py-2.5">
                  {row.tone === "in" && <span className="mr-2 text-blue-600">↙</span>}
                  {row.tone === "out" && <span className="mr-2 text-orange-600">↗</span>}
                  {row.name}
                </td>
                <td className="px-5 py-2.5 text-xs text-muted-foreground">{row.note}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right tabular-nums">
                  {som(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MonthlyTable({ rows }: { rows: PeriodRow[] }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">Oylar kesimida</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Oxirgi 12 oy</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Oy</th>
              <th className="px-5 py-2.5 text-right font-medium">Buyurtma</th>
              <th className="px-5 py-2.5 text-right font-medium">Aylanma</th>
              <th className="px-5 py-2.5 text-right font-medium">Restoranlarga</th>
              <th className="px-5 py-2.5 text-right font-medium">Komissiya</th>
              <th className="px-5 py-2.5 text-right font-medium">Servis</th>
              <th className="px-5 py-2.5 text-right font-medium">Kuryerga</th>
              <th className="px-5 py-2.5 text-right font-medium">Chegirma</th>
              <th className="px-5 py-2.5 text-right font-medium">Platforma</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  Ma&apos;lumot yo&apos;q
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.period} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-5 py-2.5">{monthLabel(row.period)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{row.orders}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{som(row.gmv)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{som(row.restaurant_earnings)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{som(row.commission)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{som(row.service_fee)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{som(row.courier_payout)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{som(row.discount)}</td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">{som(row.platform_net)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function VenueTable({
  rows,
}: {
  rows: (NamedRow & Bucket & { _id: string; type: string })[]
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">Joylar kesimida</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Oxirgi 30 kun, aylanma bo&apos;yicha eng yuqori 10 ta
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Nomi</th>
              <th className="px-5 py-2.5 text-right font-medium">Buyurtma</th>
              <th className="px-5 py-2.5 text-right font-medium">Aylanma</th>
              <th className="px-5 py-2.5 text-right font-medium">O&apos;rtacha chek</th>
              <th className="px-5 py-2.5 text-right font-medium">Joy daromadi</th>
              <th className="px-5 py-2.5 text-right font-medium">Komissiya</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  Ma&apos;lumot yo&apos;q
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row._id} className="border-b last:border-0">
                  <td className="px-5 py-2.5">
                    <Link href={`/restaurants/${row._id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{row.orders}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{som(row.gmv)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{som(row.avg_check)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{som(row.restaurant_earnings)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{som(row.commission)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
