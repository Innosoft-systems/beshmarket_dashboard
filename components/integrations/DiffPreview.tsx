"use client"

import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { changeFieldLabel, formatChangeValue, groupDiff, orderedChanges } from "@/lib/integrations"
import type { RunDiffItem } from "@/types/integration"

/**
 * Dry-run preview (plan A2): what a live run would do, grouped by operation
 * (yangi / o'zgaradi / yashiriladi / qaytadi), with from → to per changed
 * field (name and price first). The backend caps the sample at 300 items.
 */
export function DiffPreview({ items, dryRun }: { items: RunDiffItem[] | null | undefined; dryRun: boolean }) {
  const groups = groupDiff(items)

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">O&apos;zgarishlar namunasi yo&apos;q.</p>
  }

  return (
    <div className="space-y-4">
      {dryRun && (
        <p className="text-xs text-muted-foreground">
          Sinov rejimi: bular jonli rejimda bajariladigan amallar. Hozir hech narsa o&apos;zgartirilmagan. Ko&apos;pi bilan
          300 ta namuna ko&apos;rsatiladi.
        </p>
      )}
      {groups.map((group) => (
        <section key={group.op} aria-label={`${group.label} (${group.items.length})`}>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {group.label}
            <Badge variant={group.op === "deactivate" ? "destructive" : "secondary"}>{group.items.length}</Badge>
          </h4>
          <ul className="divide-y rounded-md border">
            {group.items.map((item, i) => (
              <li key={`${item.external_id}-${i}`} className="space-y-1 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium break-words">{item.name || "—"}</span>
                  <code className="text-xs break-all text-muted-foreground">{item.external_id}</code>
                </div>
                {orderedChanges(item.changes).length > 0 && (
                  <dl className="space-y-0.5 text-xs">
                    {orderedChanges(item.changes).map(([field, change]) => (
                      <div key={field} className="flex flex-wrap items-center gap-1.5">
                        <dt className="text-muted-foreground">{changeFieldLabel(field)}:</dt>
                        <dd className="flex flex-wrap items-center gap-1.5">
                          <span className="break-all line-through decoration-muted-foreground/60">
                            {formatChangeValue(change?.from)}
                          </span>
                          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="sr-only">→</span>
                          <span className="font-medium break-all">{formatChangeValue(change?.to)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
