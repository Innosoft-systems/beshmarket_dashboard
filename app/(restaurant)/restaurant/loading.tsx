import { TableSkeleton } from "@/components/ui/table-skeleton"

export default function Loading() {
  return (
    <div className="space-y-5 p-1">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <TableSkeleton rows={6} cols={4} />
    </div>
  )
}
