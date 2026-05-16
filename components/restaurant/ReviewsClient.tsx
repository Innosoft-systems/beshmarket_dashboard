'use client'
import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
      ))}
    </div>
  )
}

export function RestaurantReviewsClient({ reviews, avgRating, totalCount }: { reviews: any[]; avgRating: number; totalCount: number }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Izohlar</h1>
        <Badge variant="secondary">{totalCount} ta izoh</Badge>
      </div>

      {/* Summary */}
      <Card><CardContent className="pt-4 flex items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold">{avgRating ? avgRating.toFixed(1) : '—'}</p>
          <Stars rating={Math.round(avgRating || 0)} />
          <p className="text-xs text-muted-foreground mt-1">O'rtacha reyting</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length
            const pct = totalCount ? (count / totalCount) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right">{star}</span>
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-muted-foreground text-xs">{count}</span>
              </div>
            )
          })}
        </div>
      </CardContent></Card>

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Hali izoh yo'q</CardContent></Card>
        )}
        {reviews.map((r: any) => (
          <Card key={r._id}><CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{r.user_id?.name?.[0] ?? 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{r.user_id?.name ?? 'Foydalanuvchi'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('uz')}</p>
                </div>
                <Stars rating={r.rating} />
                {r.comment && <p className="text-sm text-foreground mt-1.5">{r.comment}</p>}
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  )
}
