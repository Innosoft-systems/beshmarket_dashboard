'use client'
import { useEffect, useRef, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import { Check, X, ChefHat, Package, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_TABS = [
  { key: 'all', label: 'Barchasi' },
  { key: 'pending', label: 'Yangi' },
  { key: 'accepted', label: 'Tayyorlanmoqda' },
  { key: 'ready', label: 'Tayyor' },
  { key: 'delivered', label: 'Yetkazildi' },
]
const STATUS_LABELS: Record<string, string> = {
  pending: 'Yangi', accepted: 'Tayyorlanmoqda', ready: 'Tayyor',
  on_the_way_to_restaurant: "Kuryer yo'lda", delivered: 'Yetkazildi', rejected: 'Bekor qilindi',
}
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default', accepted: 'secondary', ready: 'outline', delivered: 'outline', rejected: 'destructive',
}

export function RestaurantOrdersClient({ orders: init, accessToken, currentStatus }: { orders: any[]; accessToken: string; currentStatus: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [orders, setOrders] = useState(init)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { setOrders(init) }, [init])

  useEffect(() => {
    if (!accessToken) return
    audioRef.current = new Audio('/sounds/order_sound.wav')
    const socket = io(`${API_URL}/orders`, { auth: { token: accessToken }, transports: ['websocket'] })
    socket.on('order.new', (p: any) => {
      audioRef.current?.play().catch(() => {})
      toast.info(`🛒 Yangi buyurtma: ${p.orderNumber}`, { duration: 15000 })
      startTransition(() => router.refresh())
    })
    socket.on('order.status.updated', () => startTransition(() => router.refresh()))
    return () => { socket.disconnect() }
  }, [accessToken]) // eslint-disable-line

  const changeStatus = async (id: string, status: string) => {
    const res = await fetch(`${API_URL}/api/v1/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { toast.success(STATUS_LABELS[status] || status); startTransition(() => router.refresh()) }
    else { const j = await res.json().catch(() => ({})); toast.error(j.error ?? 'Xatolik') }
  }

  const pending = orders.filter(o => o.status === 'pending').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Buyurtmalar</h1>
        {pending > 0 && <p className="text-sm text-amber-600 font-medium mt-0.5">⚡ {pending} ta yangi buyurtma</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {STATUS_TABS.map(tab => (
          <button key={tab.key}
            onClick={() => startTransition(() => router.push(tab.key === 'all' ? '/restaurant/orders' : `/restaurant/orders?status=${tab.key}`))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentStatus === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
            {tab.key === 'pending' && pending > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="py-12 flex flex-col items-center text-muted-foreground gap-3">
          <Package className="h-10 w-10 opacity-30" />
          <p>Buyurtmalar topilmadi</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order: any) => (
            <Card key={order._id} className={order.status === 'pending' ? 'ring-2 ring-amber-400' : ''}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[order.status] || 'outline'}>{STATUS_LABELS[order.status] || order.status}</Badge>
                </div>

                <div className="space-y-1">
                  {order.items?.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground truncate">{item.product_name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">x{item.quantity}</span>
                    </div>
                  ))}
                  {order.items?.length > 3 && <p className="text-xs text-muted-foreground">+{order.items.length - 3} ta</p>}
                </div>

                {order.restaurant_note && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2 italic">"{order.restaurant_note}"</p>
                )}

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">Jami</span>
                  <span className="font-bold">{order.total?.toLocaleString()} so'm</span>
                </div>

                <div className="flex gap-2">
                  {order.status === 'pending' && (<>
                    <Button size="sm" className="flex-1" onClick={() => changeStatus(order._id, 'accepted')}>
                      <Check className="h-4 w-4" /> Qabul
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => changeStatus(order._id, 'rejected')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>)}
                  {order.status === 'accepted' && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => changeStatus(order._id, 'ready')}>
                      <ChefHat className="h-4 w-4" /> Tayyor
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
