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
import { markSettlementPaidAction } from "@/lib/actions/settlements"
import type { Settlement } from "@/types"

function formatAmount(tiyin: number) {
  return (tiyin / 100).toLocaleString("uz-UZ") + " so'm"
}

function getRestaurantName(restaurant_id: Settlement["restaurant_id"]): string {
  if (!restaurant_id || typeof restaurant_id === "string") return restaurant_id as string || "—"
  return restaurant_id.name || "—"
}

interface Props {
  settlement: Settlement
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MarkPaidDialog({ settlement, open, onOpenChange }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [paymentNote, setPaymentNote] = useState("")

  function handleConfirm() {
    startTransition(async () => {
      const result = await markSettlementPaidAction(settlement._id, {
        payment_note: paymentNote || undefined,
      })
      if (result.success) {
        toast.success("Hisob-kitob to'langan deb belgilandi")
        onOpenChange(false)
        setPaymentNote("")
        router.refresh()
      } else {
        toast.error(result.error || "Xatolik yuz berdi")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>To'landi deb belgilash</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Settlement summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restoran</span>
              <span className="font-medium">{getRestaurantName(settlement.restaurant_id)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To'lov miqdori</span>
              <span className="font-bold text-green-600">{formatAmount(settlement.payout_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyurtmalar</span>
              <span>{settlement.orders_count} ta</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_note">Bank o'tkazma raqami yoki izoh</Label>
            <Input
              id="payment_note"
              placeholder="Bank o'tkazma raqami yoki izoh"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Bekor qilish
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Saqlanmoqda..." : "Tasdiqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
