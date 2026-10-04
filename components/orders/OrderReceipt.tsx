"use client"

import { useRef, useState } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Order, OrderAddress, OrderClient, OrderRestaurant } from "@/types"

/** Thermal roll widths found in kitchens. 80 mm is the common one. */
type PaperWidth = 80 | 58

const PAPER_STORAGE_KEY = "receipt-paper-width"

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd pul",
  payme: "Payme",
  click: "Click",
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "TO‘LANGAN",
  refunded: "QAYTARILGAN",
}

const DELIVERY_LABELS: Record<string, string> = {
  delivery: "Yetkazib berish",
  pickup: "Olib ketish",
}

const money = new Intl.NumberFormat("uz-UZ")
const fmt = (value?: number | null) => money.format(Math.round(value ?? 0))

const asObject = <T,>(value: unknown) =>
  value && typeof value === "object" ? (value as T) : null

function esc(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  )
}

function stamp(value: string | Date) {
  const d = new Date(value)
  const p = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  }
}

const row = (label: string, value: string, cls = "") =>
  `<div class="row ${cls}"><span>${label}</span><span>${value}</span></div>`

/**
 * A self-contained HTML document for the receipt. The preview and the printout
 * render the very same document, so what the restaurant sees is what comes out
 * of the printer.
 */
export function buildReceiptHtml(order: Order, width: PaperWidth, fallbackVenue?: string) {
  const restaurant = asObject<OrderRestaurant>(order.restaurant_id)
  const client = asObject<OrderClient>(order.client_id)
  const address = asObject<OrderAddress>(order.address_id)

  const venueName = restaurant?.name || fallbackVenue || ""
  const created = stamp(order.createdAt)
  const printed = stamp(new Date())
  const unitCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  const items = (order.items ?? [])
    .map((item, i) => {
      const extras = [
        item.variant_label && item.variant_label !== "0" ? item.variant_label : null,
        ...(item.selected_modifiers ?? []).map((m) =>
          m.quantity > 1 ? `${m.name_uz} ×${m.quantity}` : m.name_uz,
        ),
      ].filter(Boolean)
      return `
        <li class="item">
          <div class="name"><span class="idx">${i + 1}.</span>${esc(item.product_name)}</div>
          ${extras.length ? `<div class="extras">+ ${extras.map(esc).join(", ")}</div>` : ""}
          ${row(`${item.quantity} × ${fmt(item.unit_price)}`, fmt(item.line_total), "line")}
          ${item.special_instructions ? `<div class="note">! ${esc(item.special_instructions)}</div>` : ""}
        </li>`
    })
    .join("")

  const paymentLabel = PAYMENT_LABELS[order.payment_method ?? "cash"] ?? esc(order.payment_method)
  const paid = order.payment_status === "paid"
  const paymentStatus = PAYMENT_STATUS_LABELS[order.payment_status] ?? "TO‘LANMAGAN"

  const addressLine = address?.full_address || address?.address || address?.street
  const addressDetails = [
    address?.entrance && `${address.entrance}-kirish`,
    address?.floor && `${address.floor}-qavat`,
    address?.apartment && `${address.apartment}-xonadon`,
  ].filter(Boolean)

  const notes = [order.client_note, order.restaurant_note].filter(Boolean)

  const fs = width === 80 ? 12 : 10.5
  const pad = width === 80 ? 4 : 2.5

  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Chek ${esc(order.order_number)}</title>
<style>
  @page { size: ${width}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { color: #000; }
  body {
    font: 500 ${fs}px/1.4 Consolas, "SF Mono", Menlo, "Courier New", monospace;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    overflow-wrap: anywhere;
  }
  .sans { font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif; }
  .paper { position: relative; width: ${width}mm; padding: 5mm ${pad}mm 6mm; background: #fff; }
  .center { text-align: center; }
  .brand {
    display: inline-block; padding: 4px 10px 3px; border: 2px solid #000;
    font-weight: 900; font-size: ${fs * 1.4}px; letter-spacing: .22em; line-height: 1;
  }
  .tagline { margin-top: 4px; font-size: .78em; letter-spacing: .32em; }
  .venue { margin-top: 9px; font-weight: 800; font-size: 1.2em; text-transform: uppercase; line-height: 1.2; }
  .muted { font-size: .9em; }
  .sep { border-top: 1px dashed #000; margin: 9px 0; }
  .sep.double { border-top: 3px double #000; }
  .title { font-size: .8em; font-weight: 700; letter-spacing: .4em; }
  .number { margin: 2px 0 4px; font-weight: 900; font-size: ${fs * 2.1}px; line-height: 1.1; letter-spacing: .02em; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .row > span:last-child { text-align: right; white-space: nowrap; }
  .items { list-style: none; }
  .item + .item { margin-top: 7px; padding-top: 7px; border-top: 1px dotted #000; }
  .name { font-weight: 800; }
  .idx { display: inline-block; min-width: 1.6em; }
  .extras { padding-left: 1.6em; font-size: .9em; }
  .line { padding-left: 1.6em; }
  .line > span:last-child { font-weight: 800; }
  .note {
    display: inline-block; margin: 3px 0 0 1.6em; padding: 1px 5px;
    border: 1.5px solid #000; font-weight: 800; font-size: .92em;
  }
  .sums .row + .row { margin-top: 2px; }
  .total {
    display: flex; justify-content: space-between; align-items: baseline;
    margin: 9px 0; padding: 7px 8px; background: #000; color: #fff;
  }
  .total .label { font-weight: 800; font-size: 1.05em; letter-spacing: .25em; }
  .total .value { font-weight: 900; font-size: ${fs * 1.6}px; line-height: 1; }
  .total small { font-size: .55em; font-weight: 700; margin-left: 3px; }
  .badge { padding: 0 5px; border: 1.5px solid #000; font-weight: 800; letter-spacing: .06em; font-size: .9em; }
  .badge.solid { background: #000; color: #fff; }
  .caption { margin-bottom: 4px; font-size: .78em; font-weight: 800; letter-spacing: .3em; }
  .strong { font-weight: 800; }
  .remark { margin-top: 4px; padding: 3px 6px; border-left: 3px solid #000; font-style: italic; }
  .thanks { font-weight: 900; font-size: 1.05em; letter-spacing: .06em; }
  .stars { letter-spacing: .5em; margin: 2px 0; }
  .foot { margin-top: 6px; font-size: .8em; }

  @media screen {
    body { display: flex; justify-content: center; padding: 18px 0 26px; }
    .sheet { filter: drop-shadow(0 8px 18px rgba(0, 0, 0, .16)); }
    /* Torn-paper teeth top and bottom, only on screen. */
    .paper::before, .paper::after {
      content: ""; position: absolute; left: 0; right: 0; height: 8px; background: #fff;
    }
    .paper::before {
      bottom: 100%;
      -webkit-mask: conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%;
      mask: conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%;
    }
    .paper::after {
      top: 100%;
      -webkit-mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%;
      mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%;
    }
  }
</style>
</head>
<body>
<div class="sheet"><div class="paper">
  <header class="center">
    <div class="brand sans">BESHMARKET</div>
    <div class="tagline">yetkazib berish</div>
    ${venueName ? `<div class="venue sans">${esc(venueName)}</div>` : ""}
    ${restaurant?.phone ? `<div class="muted">Tel: ${esc(restaurant.phone)}</div>` : ""}
  </header>

  <div class="sep"></div>

  <section class="center">
    <div class="title">BUYURTMA CHEKI</div>
    <div class="number sans">#${esc(order.order_number)}</div>
  </section>
  ${row("Sana:", created.date)}
  ${row("Vaqt:", created.time)}
  ${DELIVERY_LABELS[order.delivery_type ?? ""] ? row("Turi:", DELIVERY_LABELS[order.delivery_type!]) : ""}

  <div class="sep double"></div>

  <ul class="items">${items}</ul>

  <div class="sep"></div>

  <section class="sums">
    ${row(`Mahsulotlar (${unitCount} ta)`, fmt(order.subtotal))}
    ${order.delivery_fee > 0 ? row("Yetkazib berish", fmt(order.delivery_fee)) : ""}
    ${order.service_fee > 0 ? row("Xizmat haqi", fmt(order.service_fee)) : ""}
    ${order.discount > 0 ? row(`Chegirma${order.promo_code ? ` (${esc(order.promo_code)})` : ""}`, `−${fmt(order.discount)}`) : ""}
  </section>

  <div class="total sans">
    <span class="label">JAMI</span>
    <span class="value">${fmt(order.total)}<small>so‘m</small></span>
  </div>

  ${row(`To‘lov: <span class="strong">${paymentLabel}</span>`, `<span class="badge${paid ? " solid" : ""}">${paymentStatus}</span>`)}

  ${
    client || addressLine
      ? `<div class="sep"></div>
  <section>
    <div class="caption">MIJOZ</div>
    ${client?.full_name ? `<div class="strong">${esc(client.full_name)}</div>` : ""}
    ${client?.phone ? `<div>${esc(client.phone)}</div>` : ""}
    ${addressLine ? `<div style="margin-top:3px">${esc(addressLine)}</div>` : ""}
    ${addressDetails.length ? `<div class="muted">${addressDetails.map(esc).join(" · ")}</div>` : ""}
    ${address?.comment ? `<div class="remark">${esc(address.comment)}</div>` : ""}
  </section>`
      : ""
  }

  ${
    notes.length
      ? `<div class="sep"></div>
  <section>
    <div class="caption">IZOH</div>
    ${notes.map((n) => `<div class="remark">${esc(n)}</div>`).join("")}
  </section>`
      : ""
  }

  <div class="sep double"></div>

  <footer class="center">
    <div class="stars">* * *</div>
    <div class="thanks sans">XARIDINGIZ UCHUN RAHMAT!</div>
    <div class="muted">Yoqimli ishtaha!</div>
    <div class="foot">Chop etildi: ${printed.date} ${printed.time}</div>
  </footer>
</div></div>
</body>
</html>`
}

function readPaperWidth(): PaperWidth {
  try {
    return localStorage.getItem(PAPER_STORAGE_KEY) === "58" ? 58 : 80
  } catch {
    return 80
  }
}

interface ReceiptDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Used when the order arrives without its restaurant populated. */
  restaurantName?: string
}

export function OrderReceiptDialog({ order, open, onOpenChange, restaurantName }: ReceiptDialogProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [width, setWidth] = useState<PaperWidth>(readPaperWidth)
  const [height, setHeight] = useState(480)

  const changeWidth = (next: PaperWidth) => {
    setWidth(next)
    try {
      localStorage.setItem(PAPER_STORAGE_KEY, String(next))
    } catch {}
  }

  const print = () => {
    const win = frameRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chek · #{order.order_number}</DialogTitle>
          <DialogDescription>Chop etishdan oldin chekni ko‘rib chiqing.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Qog‘oz kengligi</span>
          <div className="flex rounded-lg bg-muted p-0.5">
            {([80, 58] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => changeWidth(w)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  width === w ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {w} mm
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-muted">
          <iframe
            ref={frameRef}
            title="Chek"
            srcDoc={buildReceiptHtml(order, width, restaurantName)}
            onLoad={(e) => {
              const doc = e.currentTarget.contentDocument
              if (doc) setHeight(doc.documentElement.scrollHeight)
            }}
            style={{ height }}
            className="block w-full border-0"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          <Button onClick={print}>
            <Printer className="h-4 w-4" /> Chop etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
