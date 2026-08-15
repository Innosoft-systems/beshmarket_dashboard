"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  LockKeyhole,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createRestaurantTopupAction } from "@/lib/actions/restaurant-panel"

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

export interface WalletData {
  balance: number
  reserved_balance: number
  available_balance: number
  commission_rate: number
  restaurant: { name: string; type?: string }
  transactions: WalletTransaction[]
  pagination: { page: number; totalPages: number; total: number }
}

export interface LegacySettlement {
  _id: string
  period_start: string
  period_end: string
  status: "pending" | "paid"
  payout_amount: number
  orders_count: number
}

interface Props {
  wallet: WalletData
  legacySettlements: LegacySettlement[]
}

function formatAmount(amount: number) {
  return `${Math.round(amount || 0).toLocaleString("uz-UZ")} so'm`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const transactionLabels: Record<WalletTransaction["type"], string> = {
  topup: "Balans to'ldirildi",
  online_order_credit: "Karta buyurtmasidan tushum",
  cash_commission: "Naqd buyurtma komissiyasi",
  correction: "Balans tuzatishi",
}

export function RestaurantSettlementsClient({ wallet, legacySettlements }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [topupOpen, setTopupOpen] = useState(false)
  const [amount, setAmount] = useState("100000")
  const [loadingMethod, setLoadingMethod] = useState<"payme" | "click" | null>(null)
  const [, startTransition] = useTransition()

  const venueWord = wallet.restaurant.type === "market" ? "do'kon" : "restoran"

  const goPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const startTopup = async (method: "payme" | "click") => {
    const parsedAmount = Math.floor(Number(amount.replace(/\s/g, "")))
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1000) {
      toast.error("Minimal to'ldirish summasi 1 000 so'm")
      return
    }

    setLoadingMethod(method)
    const result = await createRestaurantTopupAction(parsedAmount, method)
    setLoadingMethod(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    window.location.assign(result.data.url)
  }

  return (
    <div className="space-y-7 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Moliya
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Balans va hisob-kitoblar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Karta tushumlari, naqd komissiyalar va to‘ldirishlar tarixi
          </p>
        </div>
        <Button onClick={() => setTopupOpen(true)} className="gap-2 rounded-xl px-5">
          <Plus className="h-4 w-4" /> Balansni to‘ldirish
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-[#173b29] p-6 text-white shadow-sm md:p-7">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-400/15 blur-2xl" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <WalletCards className="h-5 w-5" /> Umumiy balans
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-emerald-50">
                {wallet.commission_rate}% komissiya
              </span>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight md:text-4xl">
                {formatAmount(wallet.balance)}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/80">
                Karta buyurtmasi yetkazilganda mahsulotlar summasidan komissiya ayrilib shu yerga tushadi.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
              <CreditCard className="h-4 w-4" /> Naqd buyurtmalar uchun mavjud
            </div>
            <p className="mt-4 text-2xl font-semibold">{formatAmount(wallet.available_balance)}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Yetarli bo‘lmasa, mijozga {venueWord} naqd buyurtma qabul qilmayotgani ko‘rsatiladi.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <LockKeyhole className="h-4 w-4" /> Band qilingan komissiya
            </div>
            <p className="mt-4 text-2xl font-semibold">{formatAmount(wallet.reserved_balance)}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Faol naqd buyurtmalar uchun. Bekor qilinsa avtomatik bo‘shaydi.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-background shadow-[0_1px_0_rgba(0,0,0,0.06),0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="font-semibold">Balans harakatlari</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{wallet.pagination.total} ta tranzaksiya</p>
          </div>
          <ReceiptText className="h-5 w-5 text-muted-foreground" />
        </div>

        {wallet.transactions.length ? (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
            {wallet.transactions.map((transaction) => {
              const credit = transaction.amount >= 0
              return (
                <div key={transaction._id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${credit ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
                    {credit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {transaction.title || transactionLabels[transaction.type]}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDate(transaction.createdAt)}{transaction.description ? ` · ${transaction.description}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`whitespace-nowrap text-sm font-semibold ${credit ? "text-emerald-700" : "text-orange-700"}`}>
                      {credit ? "+" : "−"}{formatAmount(Math.abs(transaction.amount))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatAmount(transaction.balance_after)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <p className="font-medium">Hali balans harakati yo‘q</p>
            <p className="mt-1 text-sm text-muted-foreground">To‘ldirish yoki yetkazilgan buyurtma shu yerda ko‘rinadi.</p>
          </div>
        )}

        {wallet.pagination.totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-5 py-4">
            <Button variant="outline" size="sm" disabled={wallet.pagination.page <= 1} onClick={() => goPage(wallet.pagination.page - 1)}>
              Oldingi
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {wallet.pagination.page} / {wallet.pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={wallet.pagination.page >= wallet.pagination.totalPages} onClick={() => goPage(wallet.pagination.page + 1)}>
              Keyingi
            </Button>
          </div>
        )}
      </section>

      {legacySettlements.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Avvalgi hisob-kitoblar</h2>
            <p className="text-xs text-muted-foreground">Wallet tizimidan oldingi payout yozuvlari</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {legacySettlements.map((item) => (
              <div key={item._id} className="rounded-2xl bg-muted/45 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(item.period_start).toLocaleDateString("uz-UZ")} – {new Date(item.period_end).toLocaleDateString("uz-UZ")}</span>
                  <span>{item.status === "paid" ? "To‘langan" : "Kutilmoqda"}</span>
                </div>
                <p className="mt-3 text-lg font-semibold">{formatAmount(item.payout_amount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.orders_count} ta buyurtma</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Balansni to‘ldirish</DialogTitle>
            <DialogDescription>
              Naqd buyurtmalarni uzluksiz qabul qilish uchun kerakli summani kiriting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="topup-amount">Summa, so‘m</Label>
            <Input
              id="topup-amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
              placeholder="100000"
              className="h-12 text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground">1 000 so‘mdan 5 000 000 so‘mgacha</p>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-11" disabled={!!loadingMethod} onClick={() => startTopup("payme")}>
              {loadingMethod === "payme" ? "Ochilmoqda..." : "Payme"}
            </Button>
            <Button className="h-11" disabled={!!loadingMethod} onClick={() => startTopup("click")}>
              {loadingMethod === "click" ? "Ochilmoqda..." : "Click"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
