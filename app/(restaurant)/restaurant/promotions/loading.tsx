import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="rounded-lg border bg-background p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="rounded-lg border bg-background overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b h-14 px-4 flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
