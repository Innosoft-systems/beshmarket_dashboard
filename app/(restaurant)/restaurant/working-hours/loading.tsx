import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="rounded-lg border bg-background">
      <div className="divide-y">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="grid gap-3 p-4 md:grid-cols-[1fr_150px_150px_120px] md:items-center">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
