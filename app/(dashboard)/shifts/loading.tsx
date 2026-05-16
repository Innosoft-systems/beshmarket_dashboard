import { TableSkeleton } from "@/components/ui/table-skeleton"
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1"><div className="h-8 w-28 bg-muted rounded animate-pulse" /><div className="h-4 w-72 bg-muted rounded animate-pulse" /></div>
      <TableSkeleton rows={8} cols={8} />
    </div>
  )
}
