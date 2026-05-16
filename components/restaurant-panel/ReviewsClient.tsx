"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { replyMyReviewAction } from "@/lib/actions/restaurant-panel"

export function ReviewsClient({ reviews }: { reviews: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [replies, setReplies] = useState<Record<string, string>>({})

  const saveReply = async (id: string) => {
    const result = await replyMyReviewAction(id, replies[id] || "")
    if (result.success) {
      toast.success("Javob saqlandi")
      setReplies((prev) => ({ ...prev, [id]: "" }))
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-3">
      {reviews.length === 0 ? (
        <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground">Izohlar yo'q</div>
      ) : reviews.map((review) => (
        <div key={review._id} className="rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{review.user_id?.full_name || review.user_id?.phone || "Mijoz"}</p>
                <Badge variant="outline">{review.status}</Badge>
              </div>
              <div className="mt-1 flex items-center gap-1 text-amber-500">
                {Array.from({ length: review.rating || 0 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleString("uz")}</p>
          </div>
          {review.comment && <p className="mt-3 text-sm">{review.comment}</p>}
          {review.restaurant_reply && (
            <div className="mt-3 rounded-md bg-muted p-3 text-sm">
              <span className="font-medium">Javob: </span>{review.restaurant_reply}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Javob yozish..."
              value={replies[review._id] ?? ""}
              onChange={(e) => setReplies((prev) => ({ ...prev, [review._id]: e.target.value }))}
            />
            <Button disabled={isPending || !replies[review._id]?.trim()} onClick={() => saveReply(review._id)}>
              Yuborish
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
