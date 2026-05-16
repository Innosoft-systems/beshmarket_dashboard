import { TableSkeleton } from "@/components/ui/table-skeleton"
export default function Loading() {
  return <div className="space-y-6"><div className="h-8 w-28 bg-muted rounded animate-pulse" /><TableSkeleton rows={6} cols={7} /></div>
}
