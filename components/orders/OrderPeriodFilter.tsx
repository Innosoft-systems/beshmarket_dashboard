"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ORDER_PERIOD_OPTIONS } from "@/lib/order-period"
import { isRangeInvalid, todayTashkent } from "@/lib/subscribers-period"

export interface OrderPeriodValue {
  period: string
  month: string
  date_from: string
  date_to: string
}

interface Props {
  value: OrderPeriodValue
  /** Receives every changed key; "" means "remove from the URL". */
  onChange: (updates: Partial<OrderPeriodValue>) => void
  compact?: boolean
  disabled?: boolean
}

/**
 * Period select plus, for "Oy tanlash" / "Sana oralig'i", the month or date
 * inputs. Stateless: the URL is the source of truth, the caller writes it.
 */
export function OrderPeriodFilter({ value, onChange, compact, disabled }: Props) {
  const period = value.period || "all"
  const rangeInvalid = period === "range" && isRangeInvalid(value.date_from, value.date_to)

  const changePeriod = (next: string) => {
    onChange({
      period: next,
      // Picking "Oy tanlash" filters straight away by the current month.
      month: next === "calendar_month" ? value.month || todayTashkent().slice(0, 7) : "",
      date_from: next === "range" ? value.date_from : "",
      date_to: next === "range" ? value.date_to : "",
    })
  }

  return (
    <>
      <Select value={period} onValueChange={(v) => changePeriod(v ?? "all")} disabled={disabled}>
        <SelectTrigger className={cn("w-full", compact ? "sm:w-40" : "sm:w-37.5")}>
          <SelectValue>
            {ORDER_PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? ORDER_PERIOD_OPTIONS[0].label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ORDER_PERIOD_OPTIONS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "calendar_month" && (
        <Input
          type="month"
          value={value.month}
          max={todayTashkent().slice(0, 7)}
          onChange={(e) => onChange({ month: e.target.value })}
          aria-label="Oy"
          className={cn("w-full", compact ? "sm:w-40" : "sm:w-44")}
          disabled={disabled}
        />
      )}

      {period === "range" && (
        // No flex-wrap: on mobile both dates share one row with the dash between them.
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            type="date"
            value={value.date_from}
            max={value.date_to || undefined}
            onChange={(e) => onChange({ date_from: e.target.value })}
            aria-label="Boshlanish sanasi"
            aria-invalid={rangeInvalid || undefined}
            className={cn("min-w-0 flex-1 sm:flex-none", compact ? "sm:w-38" : "sm:w-40")}
            disabled={disabled}
          />
          <span aria-hidden className="shrink-0 text-muted-foreground">—</span>
          <Input
            type="date"
            value={value.date_to}
            min={value.date_from || undefined}
            onChange={(e) => onChange({ date_to: e.target.value })}
            aria-label="Tugash sanasi"
            aria-invalid={rangeInvalid || undefined}
            className={cn("min-w-0 flex-1 sm:flex-none", compact ? "sm:w-38" : "sm:w-40")}
            disabled={disabled}
          />
        </div>
      )}

      {/* Own full-width line under the filter row (sm: basis-full breaks the parent's flex-wrap row).
          sm:order-last keeps Tozalash/Excel on the controls row instead of a third line; on mobile
          (flex-col) DOM order keeps the message right under the dates. */}
      {rangeInvalid && (
        <p role="alert" className="w-full text-xs text-destructive sm:order-last sm:basis-full">
          Boshlanish sanasi tugash sanasidan keyin bo&apos;lmasligi kerak.
        </p>
      )}
    </>
  )
}
