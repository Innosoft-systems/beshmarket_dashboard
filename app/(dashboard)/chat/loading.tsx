import { Skeleton } from "@/components/ui/skeleton"

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border overflow-hidden bg-background">
      {/* Conversations */}
      <div className="w-96 border-r flex flex-col shrink-0">
        <div className="px-4 py-3 border-b">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex-1 overflow-hidden p-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Chat area */}
      <div className="flex-1 flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  )
}
