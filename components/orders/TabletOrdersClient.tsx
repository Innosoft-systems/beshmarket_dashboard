"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  Ban,
  Check,
  ChefHat,
  CircleCheckBig,
  Clock3,
  CreditCard,
  History,
  ListFilter,
  LoaderCircle,
  MapPin,
  PackageOpen,
  Phone,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  cancelOrderAction,
  updateKitchenStatusAction,
  updateOrderStatusAction,
} from "@/lib/actions/orders"
import { getFullImgUrl } from "@/lib/utils"
import { kitchenWording, type VenueType } from "@/lib/order-wording"
import { stopOrderAlarm } from "@/lib/order-alarm"
import type { Order } from "@/types"

type QueueTab = "new" | "preparing" | "ready" | "completed"

const FINAL_STATUSES = new Set(["delivered", "rejected", "cancelled"])
const money = new Intl.NumberFormat("uz-UZ")

const tabs: { id: QueueTab; label: string; icon: typeof Clock3 }[] = [
  { id: "new", label: "Yangi", icon: Clock3 },
  { id: "preparing", label: "Jarayonda", icon: ChefHat },
  { id: "ready", label: "Tayyor", icon: CircleCheckBig },
  { id: "completed", label: "Yakunlangan", icon: History },
]

const emptyQueueCopy: Record<QueueTab, { title: string; description: string }> = {
  new: {
    title: "Yangi buyurtmalar yo‘q",
    description: "Yangi buyurtma kelishi bilan shu yerda ko‘rinadi.",
  },
  preparing: {
    title: "Jarayondagi buyurtmalar yo‘q",
    description: "Qabul qilingan buyurtmalar shu yerda ko‘rinadi.",
  },
  ready: {
    title: "Tayyor buyurtmalar yo‘q",
    description: "Tayyor deb belgilangan buyurtmalar shu yerda ko‘rinadi.",
  },
  completed: {
    title: "Yakunlangan buyurtmalar yo‘q",
    description: "Yetkazilgan, rad etilgan va bekor qilingan buyurtmalar shu yerda ko‘rinadi.",
  },
}

function tabFor(order: Order): QueueTab {
  if (FINAL_STATUSES.has(order.status)) return "completed"
  if (order.status === "pending") return "new"
  if (order.kitchen_status === "ready") return "ready"
  return "preparing"
}

function initialTab(orders: Order[]): QueueTab {
  return tabs.find((tab) => orders.some((order) => tabFor(order) === tab.id))?.id ?? "new"
}

function itemCount(order: Order) {
  return order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function elapsed(value: string, now: number) {
  if (!now) return formatTime(value)
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000))
  if (seconds < 60) return "hozir"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} daq` 
  const hours = Math.floor(minutes / 60)
  return `${hours} soat ${minutes % 60} daq`
}

function acceptCountdown(deadline: string | null | undefined, now: number) {
  if (!deadline || !now) return null
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000))
  return {
    label: seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "vaqt tugadi",
    urgent: seconds <= 30,
  }
}

function addressOf(order: Order) {
  const address = typeof order.address_id === "object" ? order.address_id : null
  return address?.full_address || address?.address || address?.street || "Manzil ko‘rsatilmagan"
}

function statusText(order: Order, venueType: VenueType) {
  const words = kitchenWording(venueType)
  if (order.status === "pending") return "Tasdiq kutilmoqda"
  if (order.status === "rejected") return "Rad etilgan"
  if (order.status === "cancelled") return "Bekor qilingan"
  if (order.status === "delivered") return "Yetkazilgan"
  if (order.kitchen_status === "ready") return words.readyBadge
  return words.preparingBadge
}

function progressFor(order: Order) {
  if (order.status === "delivered") return 3
  if (order.status === "rejected" || order.status === "cancelled") return 0
  if (order.kitchen_status === "ready") return 3
  if (order.status !== "pending") return 2
  return 1
}

function QueueCard({
  order,
  active,
  now,
  venueType,
  onClick,
}: {
  order: Order
  active: boolean
  now: number
  venueType: VenueType
  onClick: () => void
}) {
  const client = typeof order.client_id === "object" ? order.client_id : null
  const countdown = order.status === "pending"
    ? acceptCountdown(order.restaurant_accept_deadline, now)
    : null
  const wasStopped = order.status === "rejected" || order.status === "cancelled"

  if (wasStopped) {
    return (
      <div className="flex min-h-18 items-center justify-between gap-4 bg-[#fff4f2] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d94b43] text-white">
            <Ban className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#9f302b]">
              {order.status === "rejected" ? "Buyurtma rad etilgan" : "Buyurtma bekor qilingan"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#a76b67]">
              {order.cancel_reason || "Bu buyurtma bo‘yicha jarayon to‘xtatilgan"}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-[11px] tabular-nums text-[#a76b67]">
          {formatTime(order.createdAt)} da tushdi
        </p>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl px-4 py-3.5 text-left transition-[background-color,transform,box-shadow] duration-200 active:scale-[0.985] ${
        active
          ? "bg-white shadow-[0_10px_28px_rgba(29,46,24,0.09)]"
          : "bg-white/60 hover:bg-white"
      }`}
    >
      <span
        className={`absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary transition-transform duration-200 ${
          active ? "scale-y-100" : "scale-y-0"
        }`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold">#{order.order_number}</p>
            {order.status === "pending" && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#ff8a3d] shadow-[0_0_0_4px_rgba(255,138,61,0.13)]" />
            )}
          </div>
          <p className="mt-1 truncate text-xs text-[#7b8178]">
            {client?.full_name || "Mijoz"} · {itemCount(order)} ta mahsulot
          </p>
        </div>
        <p className="shrink-0 text-[15px] font-semibold tabular-nums">
          {money.format(order.total)}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[#edf1eb] px-2.5 py-1 text-[11px] font-medium text-[#586254]">
          {statusText(order, venueType)}
        </span>
        <span className={`flex items-center gap-1 text-[11px] font-medium tabular-nums ${countdown?.urgent ? "text-red-600" : "text-[#858b82]"}`}>
          <Clock3 className="h-3.5 w-3.5" />
          {countdown ? `Qabul: ${countdown.label}` : elapsed(order.createdAt, now)}
        </span>
      </div>
    </button>
  )
}

function ProgressHeader({ order, venueType, now }: { order: Order; venueType: VenueType; now: number }) {
  const current = progressFor(order)
  const words = kitchenWording(venueType)
  const labels = ["Qabul", words.preparingBadge, words.readyAction]
  const countdown = order.status === "pending"
    ? acceptCountdown(order.restaurant_accept_deadline, now)
    : null

  return (
    <div className="bg-[#f6f8f5] px-5 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {labels.map((label, index) => {
            const step = index + 1
            const reached = step <= current
            return (
              <div key={label} className="contents">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-300 ${
                      reached ? "bg-primary text-white" : "bg-[#e4e8e2] text-[#889085]"
                    }`}
                  >
                    {step < current || (current === 3 && step === 3) ? <Check className="h-4 w-4" /> : step}
                  </span>
                  <span className={`hidden text-xs font-medium xl:inline ${reached ? "text-[#263322]" : "text-[#92978f]"}`}>
                    {label}
                  </span>
                </div>
                {index < labels.length - 1 && (
                  <span className="relative h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-[#dde2da]">
                    <span
                      className={`absolute inset-0 origin-left bg-primary transition-transform duration-500 ${
                        step < current ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-primary">{statusText(order, venueType)}</p>
          <p className={`mt-0.5 text-[11px] tabular-nums ${countdown?.urgent ? "font-semibold text-red-600" : "text-[#8a9087]"}`}>
            {countdown ? `Qabul uchun ${countdown.label}` : `${formatTime(order.createdAt)} da tushdi`}
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyQueue({ search, tab }: { search: string; tab: QueueTab }) {
  const copy = emptyQueueCopy[tab]
  const TabIcon = tabs.find((item) => item.id === tab)?.icon ?? PackageOpen

  return (
    <div className="grid flex-1 place-items-center px-6 py-14 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e8eee5] text-primary">
          <TabIcon className="h-7 w-7" />
        </div>
        <p className="mt-4 font-semibold">{search ? "Buyurtma topilmadi" : copy.title}</p>
        <p className="mt-1 max-w-56 text-xs leading-5 text-[#838980]">
          {search ? "Qidiruvni o‘zgartirib ko‘ring." : copy.description}
        </p>
      </div>
    </div>
  )
}

interface Props {
  initialOrders: Order[]
  restaurantName: string
  venueType?: "restaurant" | "market"
}

export function TabletOrdersClient({ initialOrders, restaurantName, venueType }: Props) {
  const router = useRouter()
  const [orderOverrides, setOrderOverrides] = useState<Record<string, Partial<Order>>>({})
  const orders = useMemo(
    () => initialOrders.map((order) => ({ ...order, ...orderOverrides[order._id] })),
    [initialOrders, orderOverrides],
  )
  const [activeTab, setActiveTab] = useState<QueueTab>(() => initialTab(initialOrders))
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = initialOrders.find((order) => tabFor(order) === initialTab(initialOrders))
    return first?._id ?? null
  })
  const [search, setSearch] = useState("")
  const [now, setNow] = useState(0)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<"accept" | "ready" | "cancel" | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const previousOrderTabsRef = useRef(
    new Map(initialOrders.map((order) => [order._id, tabFor(order)])),
  )
  const [unreadByTab, setUnreadByTab] = useState<Record<QueueTab, number>>({
    new: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
  })
  const words = kitchenWording(venueType)

  useEffect(() => {
    const kickoff = window.setTimeout(() => setNow(Date.now()), 0)
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearTimeout(kickoff)
      window.clearInterval(timer)
    }
  }, [])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        tabs.map((tab) => [tab.id, orders.filter((order) => tabFor(order) === tab.id).length]),
      ) as Record<QueueTab, number>,
    [orders],
  )

  useEffect(() => {
    const previous = previousOrderTabsRef.current
    const next = new Map<string, QueueTab>()
    const additions: Record<QueueTab, number> = {
      new: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
    }

    orders.forEach((order) => {
      const nextTab = tabFor(order)
      const previousTab = previous.get(order._id)
      next.set(order._id, nextTab)

      if ((!previousTab || previousTab !== nextTab) && nextTab !== activeTab) {
        additions[nextTab] += 1
      }
    })

    previousOrderTabsRef.current = next

    if (Object.values(additions).some(Boolean)) {
      setUnreadByTab((current) => ({
        new: current.new + additions.new,
        preparing: current.preparing + additions.preparing,
        ready: current.ready + additions.ready,
        completed: current.completed + additions.completed,
      }))
    }
  }, [activeTab, orders])

  const openTab = (tab: QueueTab) => {
    stopOrderAlarm()
    setActiveTab(tab)
    setUnreadByTab((current) =>
      current[tab] === 0 ? current : { ...current, [tab]: 0 },
    )
  }

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uz")
    return orders.filter((order) => {
      if (tabFor(order) !== activeTab) return false
      if (!query) return true
      const client = typeof order.client_id === "object" ? order.client_id : null
      return [order.order_number, client?.full_name, client?.phone]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("uz").includes(query))
    })
  }, [activeTab, orders, search])

  const effectiveSelectedId = visibleOrders.some((order) => order._id === selectedId)
    ? selectedId
    : (visibleOrders[0]?._id ?? null)
  const selectedOrder = orders.find((order) => order._id === effectiveSelectedId) ?? null

  const updateLocalOrder = (id: string, patch: Partial<Order>, nextTab: QueueTab) => {
    setOrderOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }))
    openTab(nextTab)
    setSelectedId(id)
  }

  const acceptOrder = async () => {
    if (!selectedOrder) return
    stopOrderAlarm()
    setActionLoading("accept")
    const result = await updateOrderStatusAction(selectedOrder._id, "accepted")
    setActionLoading(null)
    if (!result.success) return toast.error(result.error || "Buyurtma qabul qilinmadi")
    updateLocalOrder(selectedOrder._id, { status: "accepted", kitchen_status: "preparing" }, "preparing")
    toast.success("Buyurtma qabul qilindi")
    router.refresh()
  }

  const markReady = async () => {
    if (!selectedOrder) return
    stopOrderAlarm()
    setActionLoading("ready")
    const result = await updateKitchenStatusAction(selectedOrder._id, "ready")
    setActionLoading(null)
    if (!result.success) return toast.error(result.error || "Status yangilanmadi")
    updateLocalOrder(selectedOrder._id, { kitchen_status: "ready" }, "ready")
    toast.success(words.readyToast)
    router.refresh()
  }

  const cancelOrder = async () => {
    if (!selectedOrder) return
    stopOrderAlarm()
    setActionLoading("cancel")
    const isPending = selectedOrder.status === "pending"
    const result = isPending
      ? await updateOrderStatusAction(selectedOrder._id, "rejected")
      : await cancelOrderAction(selectedOrder._id, "Restoran tomonidan bekor qilindi")
    setActionLoading(null)
    if (!result.success) return toast.error(result.error || "Amal bajarilmadi")
    updateLocalOrder(selectedOrder._id, { status: isPending ? "rejected" : "cancelled" }, "completed")
    setCancelOpen(false)
    toast.success(isPending ? "Buyurtma rad etildi" : "Buyurtma bekor qilindi")
    router.refresh()
  }

  const client = selectedOrder && typeof selectedOrder.client_id === "object" ? selectedOrder.client_id : null
  const address = selectedOrder && typeof selectedOrder.address_id === "object" ? selectedOrder.address_id : null
  const isFinal = selectedOrder ? FINAL_STATUSES.has(selectedOrder.status) : false
  const canMarkReady = selectedOrder && selectedOrder.status !== "pending" && !isFinal && selectedOrder.kitchen_status !== "ready"

  return (
    <div className="h-[calc(100dvh-7rem)] min-h-160 overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(36,54,30,0.08)] lg:grid lg:grid-cols-[minmax(19rem,35%)_1fr]">
      <aside className={`${mobileDetailOpen ? "hidden lg:flex" : "flex"} h-full min-h-0 flex-col bg-[#f3f5f1]`}>
        <div className="px-4 pb-3 pt-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{restaurantName}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Buyurtmalar</h1>
            </div>
            <Link
              href="/restaurant/orders"
              className="grid h-12 w-12 place-items-center rounded-xl bg-white text-[#697066] shadow-sm transition-transform active:scale-95"
              aria-label="Jadval ko‘rinishi"
              title="Jadval ko‘rinishi"
            >
              <ListFilter className="h-5 w-5" />
            </Link>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9188]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Raqam, ism yoki telefon..."
              className="h-12 w-full rounded-xl bg-white pl-10 pr-10 text-sm outline-none ring-primary/20 transition-shadow placeholder:text-[#a0a59e] focus:ring-4"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#7f857c] active:bg-black/5" aria-label="Qidiruvni tozalash">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="scrollbar-none flex gap-1 overflow-x-auto px-4 pb-3 sm:px-5">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            const unread = unreadByTab[tab.id]
            const needsAttention = unread > 0 && !active
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => openTab(tab.id)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-300 active:scale-[0.98] ${
                  active
                    ? "bg-[#283326] text-white"
                    : needsAttention
                      ? "bg-primary text-white shadow-[0_0_0_4px_rgba(57,153,24,0.14)] motion-safe:animate-pulse"
                      : "text-[#737a70] hover:bg-white/70"
                }`}
                aria-label={`${tab.label}${unread ? `, ${unread} ta o‘qilmagan buyurtma` : ""}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className={`grid min-w-5 place-items-center rounded-md px-1.5 py-0.5 text-[10px] transition-colors duration-300 ${active || needsAttention ? "bg-white/16 text-white" : "bg-white text-[#6f766c]"}`}>
                  {counts[tab.id]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5">
          {visibleOrders.length ? (
            <div className="space-y-2.5">
              {visibleOrders.map((order) => (
                <QueueCard
                  key={order._id}
                  order={order}
                  active={effectiveSelectedId === order._id}
                  now={now}
                  venueType={venueType}
                  onClick={() => {
                    stopOrderAlarm()
                    setSelectedId(order._id)
                    setMobileDetailOpen(true)
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyQueue search={search} tab={activeTab} />
          )}
        </div>
      </aside>

      <section className={`${mobileDetailOpen ? "flex" : "hidden lg:flex"} h-full min-h-0 flex-col bg-white`}>
        {selectedOrder ? (
          <>
            <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setMobileDetailOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f1f3ef] lg:hidden" aria-label="Buyurtmalar ro‘yxatiga qaytish">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-[-0.025em]">#{selectedOrder.order_number}</p>
                  <p className="text-[11px] text-[#858b82]">{itemCount(selectedOrder)} ta mahsulot · {formatTime(selectedOrder.createdAt)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold tabular-nums tracking-[-0.035em]">{money.format(selectedOrder.total)} <span className="text-xs font-medium">so‘m</span></p>
                <p className="text-[10px] uppercase tracking-wider text-[#939990]">buyurtma jami</p>
              </div>
            </div>

            <ProgressHeader order={selectedOrder} venueType={venueType} now={now} />

            <div key={selectedOrder._id} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 motion-safe:animate-in motion-safe:slide-in-from-right-2 motion-safe:duration-200 sm:px-6">
              <div className="grid gap-5 xl:grid-cols-[1fr_15rem]">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Buyurtma tarkibi</h2>
                    <span className="text-xs text-[#858b82]">{selectedOrder.items?.length ?? 0} xil mahsulot</span>
                  </div>
                  <div className="divide-y divide-[#edf0eb]">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={`${item.product_id}-${index}`} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0">
                        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-[#f1f3ef]">
                          {item.product_image ? (
                            <img src={getFullImgUrl(item.product_image)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-[#9da39a]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-sm font-medium leading-5">{item.product_name}</p>
                            <span className="rounded-md bg-[#ebf4e8] px-2 py-0.5 text-xs font-semibold text-primary">×{item.quantity}</span>
                          </div>
                          {((item.variant_label && item.variant_label !== "0") || item.selected_modifiers?.length) && (
                            <p className="mt-1 text-[11px] leading-4 text-[#80877d]">
                              {[item.variant_label !== "0" ? item.variant_label : null, ...(item.selected_modifiers?.map((modifier) => modifier.quantity > 1 ? `${modifier.name_uz} ×${modifier.quantity}` : modifier.name_uz) ?? [])].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {item.special_instructions && (
                            <p className="mt-1 rounded-md bg-[#fff4e8] px-2 py-1 text-[11px] font-medium text-[#a45d22]">{item.special_instructions}</p>
                          )}
                        </div>
                        <p className="pl-2 text-sm font-semibold tabular-nums">{money.format(item.line_total)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 bg-[#f7f8f6] px-4 py-3.5">
                    <div className="flex items-center justify-between text-xs text-[#737a70]"><span>Mahsulotlar</span><span>{money.format(selectedOrder.subtotal)} so‘m</span></div>
                    {selectedOrder.delivery_fee > 0 && <div className="mt-2 flex items-center justify-between text-xs text-[#737a70]"><span>Yetkazib berish</span><span>{money.format(selectedOrder.delivery_fee)} so‘m</span></div>}
                    {selectedOrder.service_fee > 0 && <div className="mt-2 flex items-center justify-between text-xs text-[#737a70]"><span>Xizmat haqi</span><span>{money.format(selectedOrder.service_fee)} so‘m</span></div>}
                    {selectedOrder.discount > 0 && <div className="mt-2 flex items-center justify-between text-xs font-medium text-primary"><span>Chegirma</span><span>−{money.format(selectedOrder.discount)} so‘m</span></div>}
                  </div>
                </div>

                <div className="space-y-3 xl:border-l xl:border-[#edf0eb] xl:pl-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92988f]">Mijoz</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf2ea] text-primary"><UserRound className="h-4.5 w-4.5" /></span>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{client?.full_name || "Noma’lum mijoz"}</p><p className="text-xs text-[#82887f]">{client?.phone || "Telefon yo‘q"}</p></div>
                    </div>
                    {client?.phone && <a href={`tel:${client.phone}`} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#edf4ea] text-xs font-semibold text-primary transition-transform active:scale-[0.98]"><Phone className="h-4 w-4" /> Qo‘ng‘iroq qilish</a>}
                  </div>

                  <div className="h-px bg-[#edf0eb]" />
                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92988f]"><MapPin className="h-3.5 w-3.5" /> Manzil</p>
                    <p className="mt-2 text-xs font-medium leading-5">{addressOf(selectedOrder)}</p>
                    {(address?.entrance || address?.floor || address?.apartment) && <p className="mt-1 text-[11px] leading-4 text-[#858b82]">{[address.entrance && `Kirish ${address.entrance}`, address.floor && `${address.floor}-qavat`, address.apartment && `${address.apartment}-xonadon`].filter(Boolean).join(" · ")}</p>}
                    {address?.comment && <p className="mt-2 bg-[#fff7e8] px-2.5 py-2 text-[11px] leading-4 text-[#805f2c]">{address.comment}</p>}
                  </div>

                  <div className="h-px bg-[#edf0eb]" />
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92988f]">To‘lov</p><p className="mt-1 text-xs font-medium">{selectedOrder.payment_method === "cash" || !selectedOrder.payment_method ? "Naqd pul" : selectedOrder.payment_method.toUpperCase()}</p></div>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1f3ef] text-[#687065]">{selectedOrder.payment_method === "cash" || !selectedOrder.payment_method ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}</span>
                  </div>

                  {selectedOrder.restaurant_note && <><div className="h-px bg-[#edf0eb]" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92988f]">Buyurtma izohi</p><p className="mt-2 text-xs leading-5 text-[#545c51]">{selectedOrder.restaurant_note}</p></div></>}
                </div>
              </div>
            </div>

            {!isFinal && (
              <div className="shrink-0 border-t border-[#edf0eb] bg-white px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setCancelOpen(true)} disabled={!!actionLoading} className="h-13 rounded-xl px-4 text-sm font-semibold text-[#ba3e38] transition-colors hover:bg-red-50 active:scale-[0.98] disabled:opacity-50">
                    {selectedOrder.status === "pending" ? "Rad etish" : "Bekor qilish"}
                  </button>
                  {selectedOrder.status === "pending" && (
                    <button type="button" onClick={acceptOrder} disabled={!!actionLoading} className="flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(57,153,24,0.2)] transition-[transform,background-color] hover:bg-[#318516] active:scale-[0.99] disabled:opacity-60">
                      {actionLoading === "accept" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Qabul qilish
                    </button>
                  )}
                  {canMarkReady && (
                    <button type="button" onClick={markReady} disabled={!!actionLoading} className="flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(57,153,24,0.2)] transition-[transform,background-color] hover:bg-[#318516] active:scale-[0.99] disabled:opacity-60">
                      {actionLoading === "ready" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ChefHat className="h-5 w-5" />} {words.readyAction}
                    </button>
                  )}
                  {!canMarkReady && selectedOrder.status !== "pending" && (
                    <div className="flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf4ea] px-5 text-sm font-semibold text-primary"><CircleCheckBig className="h-5 w-5" /> {words.readyBadge}</div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#edf2ea] text-primary"><ShoppingBag className="h-8 w-8" /></div><h2 className="mt-5 text-lg font-semibold">Buyurtmani tanlang</h2><p className="mt-1 text-sm text-[#858b82]">Tafsilotlar va boshqaruv shu yerda ochiladi.</p></div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={selectedOrder?.status === "pending" ? "Buyurtmani rad etasizmi?" : "Buyurtmani bekor qilasizmi?"}
        description="Bu amal mijozga va buyurtma jarayoniga darhol ta’sir qiladi."
        confirmLabel={selectedOrder?.status === "pending" ? "Rad etish" : "Bekor qilish"}
        loading={actionLoading === "cancel"}
        onConfirm={cancelOrder}
      />
    </div>
  )
}
