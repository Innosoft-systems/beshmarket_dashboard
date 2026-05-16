import { TableSkeleton } from "@/components/ui/table-skeleton"
export default function Loading() {
  return <div className="space-y-6"><div className="h-8 w-24 bg-muted rounded animate-pulse" /><TableSkeleton rows={8} cols={6} /></div>
}
