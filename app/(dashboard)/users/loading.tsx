import { Skeleton } from "@/components/ui/skeleton"

export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <Skeleton className="h-10 w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm" />
        <Skeleton className="h-10 w-full sm:w-[160px]" />
        <Skeleton className="h-10 w-full sm:w-[160px]" />
      </div>
      {/* Table */}
      <div className="rounded-md border bg-background">
        <div className="flex h-12 items-center px-3 gap-6 border-b">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center px-3 py-3 border-b last:border-0 gap-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        ))}
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  )
}
