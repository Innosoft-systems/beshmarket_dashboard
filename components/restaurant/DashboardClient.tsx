'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import { ShoppingBag, Clock, Star, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const UZ_MONTHS = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']

const KPI_DEFS = [
  { key: 'today_orders', label: 'Bugungi buyurtmalar', icon: ShoppingBag, color: 'text-blue-500' },
  { key: 'pending_orders', label: 'Kutilmoqda', icon: Clock, color: 'text-amber-500' },
  { key: 'avg_rating', label: 'Reyting', icon: Star, color: 'text-yellow-500', format: (v: number) => v ? v.toFixed(1) : '—' },
  { key: 'total_orders', label: 'Jami buyurtmalar', icon: TrendingUp, color: 'text-primary' },
]

export function RestaurantDashboardClient({ stats, accessToken }: { stats: any; accessToken: string }) {
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${API_URL}/orders`, { auth: { token: accessToken }, transports: ['websocket'] })
    socket.on('order.new', (p: any) => {
      toast.info(`🛒 Yangi buyurtma: ${p.orderNumber}`, { duration: 10000 })
      router.refresh()
    })
    return () => { socket.disconnect() }
  }, [accessToken]) // eslint-disable-line

  const trendData = (() => {
    const map = new Map((stats.weekly_trend || []).map((d: any) => [d._id, d]))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      const e = (map.get(key) as any) || { orders: 0 }
      return { date: `${d.getDate()} ${UZ_MONTHS[d.getMonth()]}`, Buyurtmalar: e.orders }
    })
  })()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Bugungi ko'rsatkichlar</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_DEFS.map(({ key, label, icon: Icon, color, format }) => (
          <Card key={key}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-3xl font-bold">{format ? format(stats[key]) : (stats[key] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <h3 className="font-semibold mb-4">7 kunlik buyurtmalar</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'Buyurtmalar']} />
              <Area type="monotone" dataKey="Buyurtmalar" stroke="var(--color-primary)" fill="url(#gOrders)" strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
