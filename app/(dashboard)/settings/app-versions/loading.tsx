import { Skeleton } from "@/components/ui/skeleton"

export default function AppVersionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Platform tabs */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Card */}
      <div className="rounded-xl border p-6 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        <Skeleton className="h-12 w-full rounded-lg" />

        <div className="flex justify-end">
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  )
}
