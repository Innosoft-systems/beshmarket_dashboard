'use client'
import { Card, CardContent } from '@/components/ui/card'
import { ShoppingBag, TrendingUp, Star, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const UZ_MONTHS = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']

export function RestaurantStatsClient({ stats }: { stats: any }) {
  const monthlyData = (stats.monthly_stats || []).map((d: any) => ({
    month: `${UZ_MONTHS[(d._id?.month ?? 1) - 1]} ${d._id?.year ?? ''}`,
    Buyurtmalar: d.orders,
    Daromad: Math.round((d.revenue || 0) / 1000),
  }))

  const kpis = [
    { label: 'Jami buyurtmalar', value: stats.total_orders ?? 0, icon: ShoppingBag, color: 'text-blue-500' },
    { label: 'Jami daromad', value: `${((stats.total_revenue ?? 0) / 1000000).toFixed(1)} mln`, icon: DollarSign, color: 'text-primary' },
    { label: 'O\'rtacha reyting', value: stats.avg_rating ? stats.avg_rating.toFixed(1) : '—', icon: Star, color: 'text-yellow-500' },
    { label: 'Bu oy buyurtmalar', value: stats.this_month_orders ?? 0, icon: TrendingUp, color: 'text-purple-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Statistika</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <h3 className="font-semibold mb-4">Oylik buyurtmalar</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Buyurtmalar" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
