import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import {
  BalanceTile,
  WalletMovementChart,
  type WalletChartPoint,
} from "@/components/charts/WalletCharts"

export const metadata: Metadata = { title: "Restoran balansi | BeshMarket" }

interface WalletTransaction {
  _id: string
  type: "topup" | "online_order_credit" | "cash_commission" | "correction"
  amount: number
  balance_after: number
  title?: string
  description?: string
  payment_method?: string
  createdAt: string
}

interface Wallet {
  balance: number
  reserved_balance: number
  available_balance: number
  commission_rate: number
  restaurant: { _id: string; name: string; type?: string }
  chart: WalletChartPoint[]
  transactions: WalletTransaction[]
  pagination: { page: number; totalPages: number; total: number }
}

const TYPE_LABELS: Record<WalletTransaction["type"], string> = {
  topup: "Balans to'ldirildi",
  online_order_credit: "Karta buyurtmasidan tushum",
  cash_commission: "Naqd buyurtma komissiyasi",
  correction: "Balans tuzatishi",
}

const som = (value: number) => `${Math.round(value || 0).toLocaleString("uz-UZ")} so'm`

const formatDate = (value: string) =>
  new Date(value).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export default async function RestaurantBalancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const token = await getAccessToken()
  const { id } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const res = await apiRequest<Wallet>(
    `/restaurants/admin/${id}/wallet?page=${page}&limit=20`,
    { accessToken: token },
  ).catch(() => null)

  if (!res?.data) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
        Balansni yuklashda xatolik yuz berdi.
      </div>
    )
  }

  const wallet = res.data
  const venueWord = wallet.restaurant.type === "market" ? "do'kon" : "restoran"

  return (
    <div className="space-y-6 pb-8">
      <div>
        <Link
          href="/balances"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Balanslar
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{wallet.restaurant.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Virtual hamyon · {wallet.commission_rate}% komissiya
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <BalanceTile label="Balans" value={wallet.balance} accent="credit" />
        <BalanceTile
          label="Band qilingan"
          value={wallet.reserved_balance}
          hint="Faol naqd buyurtmalar uchun"
          accent="debit"
        />
        <BalanceTile
          label="Mavjud"
          value={wallet.available_balance}
          hint={`Yetarli bo'lmasa ${venueWord} naqd buyurtma qabul qilmaydi`}
        />
      </section>

      <WalletMovementChart data={wallet.chart} />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Balans harakatlari</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {wallet.pagination.total} ta tranzaksiya
          </p>
        </div>

        {wallet.transactions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Hozircha tranzaksiya yo&apos;q
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Sana</th>
                  <th className="px-5 py-2.5 font-medium">Turi</th>
                  <th className="px-5 py-2.5 text-right font-medium">Summa</th>
                  <th className="px-5 py-2.5 text-right font-medium">Keyingi balans</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map(transaction => (
                  <tr key={transaction._id} className="border-b last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-foreground">
                        {transaction.title || TYPE_LABELS[transaction.type]}
                      </span>
                      {transaction.description && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {transaction.description}
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-5 py-3 text-right tabular-nums ${
                        transaction.amount >= 0 ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {transaction.amount >= 0 ? "+" : "−"}
                      {som(Math.abs(transaction.amount))}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                      {som(transaction.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {wallet.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
            <span className="text-muted-foreground">
              {wallet.pagination.page} / {wallet.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/balances/${id}?page=${page - 1}`}
                  className="rounded-md border px-3 py-1.5 hover:bg-muted"
                >
                  Oldingi
                </Link>
              )}
              {page < wallet.pagination.totalPages && (
                <Link
                  href={`/balances/${id}?page=${page + 1}`}
                  className="rounded-md border px-3 py-1.5 hover:bg-muted"
                >
                  Keyingi
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
