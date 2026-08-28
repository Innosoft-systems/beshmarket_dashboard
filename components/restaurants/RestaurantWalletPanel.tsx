"use client"

import { useState, useTransition } from "react"
import { ArrowDownLeft, ArrowUpRight, Loader2, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BalanceTile, WalletMovementChart, type WalletChartPoint } from "@/components/charts/WalletCharts"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import {
  adjustRestaurantBalanceAction,
  loadWalletPageAction,
  type WalletTransaction,
} from "@/lib/actions/restaurant-admin"

export interface WalletData {
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
  correction: "Admin tuzatishi",
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

type Filter = "all" | "credit" | "debit"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "credit", label: "Tushumlar" },
  { key: "debit", label: "Yechilganlar" },
]

export function RestaurantWalletPanel({ wallet }: { wallet: WalletData }) {
  const restaurantId = wallet.restaurant._id
  const [filter, setFilter] = useState<Filter>("all")
  const [dialog, setDialog] = useState<"topup" | "deduct" | null>(null)
  const [, startTransition] = useTransition()

  const ledger = useInfiniteList<WalletTransaction>({
    initial: {
      items: wallet.transactions,
      totalPages: wallet.pagination.totalPages,
      total: wallet.pagination.total,
    },
    loadPage: async page => {
      const result = await loadWalletPageAction(
        restaurantId,
        page,
        filter === "all" ? undefined : filter,
      )
      if (!result.success) return null
      return {
        items: result.data.transactions,
        totalPages: result.data.pagination.totalPages,
        total: result.data.pagination.total,
      }
    },
    getKey: transaction => transaction._id,
  })

  const changeFilter = (next: Filter) => {
    if (next === filter) return
    setFilter(next)
    startTransition(async () => {
      const result = await loadWalletPageAction(
        restaurantId,
        1,
        next === "all" ? undefined : next,
      )
      if (!result.success) {
        toast.error(result.error)
        return
      }
      ledger.reset({
        items: result.data.transactions,
        totalPages: result.data.pagination.totalPages,
        total: result.data.pagination.total,
      })
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <BalanceTile label="Balans" value={wallet.balance} accent="credit" />
        <BalanceTile
          label="Band qilingan"
          value={wallet.reserved_balance}
          hint="Faol naqd buyurtmalar komissiyasi"
          accent="debit"
        />
        <BalanceTile
          label="Mavjud"
          value={wallet.available_balance}
          hint={`Komissiya ${wallet.commission_rate}%`}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialog("topup")} className="gap-2">
          <Plus className="h-4 w-4" /> Balansga pul tashlash
        </Button>
        <Button variant="outline" onClick={() => setDialog("deduct")} className="gap-2">
          <Minus className="h-4 w-4" /> Balansdan yechish
        </Button>
      </div>

      <WalletMovementChart data={wallet.chart} />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Balans harakatlari</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              To&apos;ldirishlar, tushumlar va yechilganlar — hammasi shu yerda
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {FILTERS.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => changeFilter(item.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === item.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {ledger.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            Bu bo&apos;limda yozuv yo&apos;q
          </p>
        ) : (
          <ul className="divide-y">
            {ledger.items.map(transaction => {
              const credit = transaction.amount >= 0
              return (
                <li key={transaction._id} className="flex items-start gap-4 px-5 py-4">
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      credit ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                    }`}
                  >
                    {credit ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {transaction.title || TYPE_LABELS[transaction.type]}
                    </p>
                    {transaction.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {transaction.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(transaction.createdAt)}
                      {transaction.created_by && (
                        <>
                          {" · "}
                          {transaction.created_by.full_name ||
                            transaction.created_by.username ||
                            "admin"}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {credit ? "+" : "−"}
                      {som(Math.abs(transaction.amount))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {som(transaction.balance_after)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div ref={ledger.sentinelRef} />
        {ledger.loading && (
          <p className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yuklanmoqda…
          </p>
        )}
        {ledger.error && (
          <div className="px-5 py-4 text-center">
            <p className="text-xs text-red-500">{ledger.error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={ledger.loadMore}>
              Qayta urinish
            </Button>
          </div>
        )}
      </section>

      <AdjustDialog
        mode={dialog}
        restaurantId={restaurantId}
        available={wallet.balance}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}

function AdjustDialog({
  mode,
  restaurantId,
  available,
  onClose,
}: {
  mode: "topup" | "deduct" | null
  restaurantId: string
  available: number
  onClose: () => void
}) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const deduct = mode === "deduct"

  const close = () => {
    setAmount("")
    setReason("")
    onClose()
  }

  const submit = async () => {
    const parsed = Math.floor(Number(amount.replace(/\s/g, "")))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Summani to'g'ri kiriting")
      return
    }
    if (reason.trim().length < 3) {
      toast.error("Sababni yozing (kamida 3 ta belgi)")
      return
    }
    if (deduct && parsed > available) {
      toast.error(`Balansda ${som(available)} bor, undan ko'pini yechib bo'lmaydi`)
      return
    }

    setSaving(true)
    const result = await adjustRestaurantBalanceAction(
      restaurantId,
      deduct ? -parsed : parsed,
      reason.trim(),
    )
    setSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(
      deduct
        ? `${som(parsed)} yechildi. Yangi balans: ${som(result.data.balance)}`
        : `${som(parsed)} qo'shildi. Yangi balans: ${som(result.data.balance)}`,
    )
    close()
  }

  return (
    <Dialog open={mode !== null} onOpenChange={open => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deduct ? "Balansdan yechish" : "Balansga pul tashlash"}
          </DialogTitle>
          <DialogDescription>
            {deduct
              ? `Hozirgi balans: ${som(available)}. Yechilgan summa tarixda sababi bilan saqlanadi.`
              : "Qo'shilgan summa tarixda sababi bilan saqlanadi."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Summa (so&apos;m) *</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder="100000"
            />
          </div>
          <div className="space-y-2">
            <Label>Sabab *</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder={
                deduct
                  ? "Masalan: yetkazilmagan buyurtma uchun jarima"
                  : "Masalan: qo'lda to'lov qabul qilindi"
              }
            />
            <p className="text-xs text-muted-foreground">
              Sabab majburiy — keyin bu yozuvni kim va nega qilganini tushunish uchun.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            Bekor qilish
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {deduct ? "Yechish" : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
