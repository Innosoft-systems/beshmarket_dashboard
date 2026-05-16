"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

interface TrendItem {
  _id: string
  orders: number
  revenue: number
}

interface Product {
  _id: string
  name_uz: string
  order_count?: number
  avg_rating?: number
}

interface Props {
  weeklyTrend: TrendItem[]
  topProducts: Product[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}-${d.toLocaleDateString("uz", { month: "short" })}`
}

function formatRevenue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return String(value)
}

export function AnalyticsCharts({ weeklyTrend, topProducts }: Props) {
  const chartData = weeklyTrend.map((item) => ({
    date: formatDate(item._id),
    buyurtma: item.orders,
    daromad: item.revenue,
  }))

  return (
    <div className="space-y-5">
      {/* Weekly trend chart */}
      <div className="rounded-lg border bg-background p-4">
        <h2 className="font-medium mb-4">Haftalik trend (so'nggi 7 kun)</h2>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Ma'lumot yo'q</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => String(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={formatRevenue}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "daromad"
                    ? [`${value.toLocaleString()} so'm`, "Daromad"]
                    : [value, "Buyurtmalar"]
                }
              />
              <Legend />
              <Bar yAxisId="left" dataKey="buyurtma" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="daromad" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top products table */}
      <div className="rounded-lg border bg-background overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-medium">Top mahsulotlar</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-10 px-4 text-left font-medium">#</th>
              <th className="h-10 px-4 text-left font-medium">Mahsulot</th>
              <th className="h-10 px-4 text-right font-medium">Buyurtmalar</th>
              <th className="h-10 px-4 text-right font-medium">Reyting</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((product, index) => (
              <tr key={product._id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3">{product.name_uz}</td>
                <td className="px-4 py-3 text-right">{product.order_count || 0}</td>
                <td className="px-4 py-3 text-right">{product.avg_rating || 0}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                  Mahsulot statistikasi yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
