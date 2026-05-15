"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSettingAction } from "@/lib/actions/settings"

const COURIER_KEYS = ["shift_cancellation_hours", "shift_penalty_per_hour", "courier_order_reject_penalty"]

const LABELS: Record<string, string> = {
  shift_cancellation_hours: "Smena bekor qilish (soat)",
  shift_penalty_per_hour: "Soatlik jarima (so'm)",
  courier_order_reject_penalty: "Buyurtma rad etish jarimasi (so'm)",
}

export function SettingsCouriersClient({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const filtered = settings.filter((s) => COURIER_KEYS.includes(s.key))
  const [values, setValues] = useState<Record<string, any>>(
    Object.fromEntries(filtered.map((s) => [s.key, s.value]))
  )
  const [loading, setLoading] = useState<string | null>(null)

  const handleSave = async (key: string) => {
    setLoading(key)
    const result = await updateSettingAction(key, Number(values[key]))
    setLoading(null)
    if (result.success) {
      toast.success("Saqlandi")
      router.refresh()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">Kuryer sozlamalari</h1>
      <div className="space-y-4 max-w-lg">
        {COURIER_KEYS.map((key) => (
          <div key={key} className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>{LABELS[key] || key}</Label>
              <Input
                type="number"
                value={values[key] ?? ""}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              />
            </div>
            <Button onClick={() => handleSave(key)} disabled={loading === key} size="lg">
              {loading === key ? "..." : "Saqlash"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
