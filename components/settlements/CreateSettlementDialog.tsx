"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createSettlementAction, previewSettlementAction } from "@/lib/actions/settlements"
import type { SettlementPreview } from "@/types"
import type { Restaurant } from "@/types"

function formatAmount(tiyin: number) {
  return (tiyin / 100).toLocaleString("uz-UZ") + " so'm"
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurants: Restaurant[]
}

export function CreateSettlementDialog({ open, onOpenChange, restaurants }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isPreviewPending, startPreviewTransition] = useTransition()

  const [restaurantId, setRestaurantId] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [paymentNote, setPaymentNote] = useState("")
  const [preview, setPreview] = useState<SettlementPreview | null>(null)
  const [previewError, setPreviewError] = useState("")

  function resetForm() {
    setRestaurantId("")
    setPeriodStart("")
    setPeriodEnd("")
    setPaymentNote("")
    setPreview(null)
    setPreviewError("")
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm()
    onOpenChange(val)
  }

  function handlePreview() {
    if (!restaurantId || !periodStart || !periodEnd) {
      setPreviewError("Restoran va davr majburiy")
      return
    }
    setPreviewError("")
    startPreviewTransition(async () => {
      const result = await previewSettlementAction({
        restaurant_id: restaurantId,
        period_start: periodStart,
        period_end: periodEnd,
      })
      if (result.success) {
        setPreview(result.data as SettlementPreview)
      } else {
        setPreviewError(result.error || "Ko'rib chiqib bo'lmadi")
        setPreview(null)
      }
    })
  }

  function handleCreate() {
    if (!restaurantId || !periodStart || !periodEnd) {
      setPreviewError("Restoran va davr majburiy")
      return
    }
    startTransition(async () => {
      const result = await createSettlementAction({
        restaurant_id: restaurantId,
        period_start: periodStart,
        period_end: periodEnd,
        payment_note: paymentNote || undefined,
      })
      if (result.success) {
        toast.success("Hisob-kitob yaratildi")
        handleOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || "Xatolik yuz berdi")
      }
    })
  }

  // Detect selected restaurant commission rate for preview label
  const selectedRestaurant = restaurants.find((r) => r._id === restaurantId)
  const commissionRate = selectedRestaurant?.commission_rate ?? null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yangi hisob-kitob</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Restaurant selector */}
          <div className="space-y-1.5">
            <Label>Restoran</Label>
            {restaurants.length > 0 ? (
              <Select value={restaurantId} onValueChange={(v: string | null) => { setRestaurantId(v ?? ""); setPreview(null) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Restoran tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Restoran ID"
                value={restaurantId}
                onChange={(e) => { setRestaurantId(e.target.value ?? ""); setPreview(null) }}
              />
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="period_start">Boshlanish sanasi</Label>
              <Input
                id="period_start"
                type="date"
                value={periodStart}
                onChange={(e) => { setPeriodStart(e.target.value); setPreview(null) }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period_end">Tugash sanasi</Label>
              <Input
                id="period_end"
                type="date"
                value={periodEnd}
                onChange={(e) => { setPeriodEnd(e.target.value); setPreview(null) }}
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_note">Izoh (ixtiyoriy)</Label>
            <Input
              id="payment_note"
              placeholder="Izoh (ixtiyoriy)"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
            />
          </div>

          {/* Preview button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handlePreview}
            disabled={isPreviewPending || !restaurantId || !periodStart || !periodEnd}
          >
            {isPreviewPending ? "Hisoblanmoqda..." : "Ko'rib chiqish"}
          </Button>

          {previewError && (
            <p className="text-sm text-destructive">{previewError}</p>
          )}

          {/* Preview result */}
          {preview && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyurtmalar</span>
                <span className="font-medium">{preview.orders_count} ta</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jami summa</span>
                <span>{formatAmount(preview.total_orders_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Komissiya{commissionRate != null ? ` (${commissionRate}%)` : ""}
                </span>
                <span className="text-red-600">−{formatAmount(preview.commission_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">To'lov miqdori</span>
                <span className="font-bold text-green-600">{formatAmount(preview.payout_amount)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Bekor qilish
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !restaurantId || !periodStart || !periodEnd}>
            {isPending ? "Yaratilmoqda..." : "Yaratish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
