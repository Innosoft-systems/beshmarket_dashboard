import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-background p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-24 ml-auto" />
      </div>
      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="border-b bg-muted/30 h-11 px-4 flex items-center gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b last:border-0 h-14 px-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={`h-4 ${j === 0 ? "w-32" : j === cols - 1 ? "w-16 ml-auto" : "w-24"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
