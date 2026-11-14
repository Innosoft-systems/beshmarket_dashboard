"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  RUN_STATUS_LABELS,
  formatAgo,
  formatTashkentDateTime,
  hiddenReasonRows,
  runProgress,
} from "@/lib/integrations"
import type { IntegrationConnection, IntegrationRunSummary, IntegrationStatus } from "@/types/integration"

/** Last contact / last successes / last error plus synced-product counts (GET …/status). */
export function StatusPanel({
  connection,
  status,
  loading,
  onRefresh,
}: {
  connection: IntegrationConnection
  status: IntegrationStatus | null
  loading?: boolean
  onRefresh?: () => void
}) {
  // The status call returns a fresher connection; fall back to the page's copy.
  const c = status?.connection ?? connection
  const hidden = hiddenReasonRows(status?.hidden_by_sync)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Holat
          {status?.stale && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Sinxronlash kechikmoqda
            </Badge>
          )}
        </CardTitle>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Yangilash
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Oxirgi so'rov" iso={c.last_request_at} empty="1C hali bog'lanmagan" />
          <Fact label="Oxirgi katalog (muvaffaqiyatli)" iso={c.last_catalog_success_at} />
          <Fact label="Oxirgi narx-qoldiq (muvaffaqiyatli)" iso={c.last_offers_success_at} />
        </dl>

        {c.last_error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive">
              Oxirgi xatolik · {formatTashkentDateTime(c.last_error.at)}
            </p>
            <p className="mt-1 break-words">{c.last_error.message}</p>
          </div>
        )}

        {status ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Counter label="1C mahsulotlari" value={status.synced_products} />
              <Counter label="Faol" value={status.active_synced} />
              <Counter label="Yashirilgan" value={Math.max(0, status.synced_products - status.active_synced)} />
            </div>

            {hidden.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Yashirilish sababi</p>
                <ul className="flex flex-wrap gap-2">
                  {hidden.map((row) => (
                    <li key={row.reason}>
                      <Badge variant="outline">
                        {row.label}: {row.count}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LastRun title="Katalog" run={status.last_run?.catalog ?? null} />
              <LastRun title="Narx-qoldiq" run={status.last_run?.offers ?? null} />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">
            {loading ? "Holat yuklanmoqda..." : "Holatni yuklab bo'lmadi."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Fact({ label, iso, empty = "—" }: { label: string; iso?: string | null; empty?: string }) {
  const ago = formatAgo(iso)
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {iso ? (
          <>
            {formatTashkentDateTime(iso)}{" "}
            {/* "N daqiqa oldin" depends on the clock, so server and client may differ by a minute. */}
            {ago && (
              <span className="font-normal text-muted-foreground" suppressHydrationWarning>
                ({ago})
              </span>
            )}
          </>
        ) : (
          <span className="font-normal text-muted-foreground">{empty}</span>
        )}
      </dd>
    </div>
  )
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/30 p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{(value ?? 0).toLocaleString("ru-RU")}</p>
    </div>
  )
}

function LastRun({ title, run }: { title: string; run: IntegrationRunSummary | null }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">Oxirgi {title.toLowerCase()} ishga tushishi</p>
      {run ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={run.status === "failed" || run.status === "needs_review" ? "destructive" : "secondary"}>
            {RUN_STATUS_LABELS[run.status] ?? run.status}
          </Badge>
          {run.dry_run && <Badge variant="outline">Sinov</Badge>}
          <span className="text-xs text-muted-foreground">
            {formatTashkentDateTime(run.finished_at ?? run.last_batch_at ?? run.first_batch_at)} · {runProgress(run)} paket
          </span>
        </div>
      ) : (
        <p className="mt-1 text-muted-foreground">Hali bo&apos;lmagan</p>
      )}
    </div>
  )
}
