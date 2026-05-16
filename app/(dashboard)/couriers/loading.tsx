import { TableSkeleton } from "@/components/ui/table-skeleton"
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1"><div className="h-8 w-32 bg-muted rounded animate-pulse" /><div className="h-4 w-64 bg-muted rounded animate-pulse" /></div>
      <TableSkeleton rows={10} cols={7} />
    </div>
  )
}
