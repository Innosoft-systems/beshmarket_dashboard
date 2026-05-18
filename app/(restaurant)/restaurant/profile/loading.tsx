import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5 rounded-lg border bg-background p-5">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`space-y-2 ${i === 4 || i === 8 ? "md:col-span-2" : ""}`}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-24" />
    </div>
  )
}
