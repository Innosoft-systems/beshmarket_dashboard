"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { RefreshCw } from "lucide-react"

import { listRunsAction } from "@/lib/actions/integrations"
import {
  RUN_KIND_LABELS,
  RUN_STATUS_LABELS,
  formatTashkentDateTime,
  isBucketRun,
  runBatches,
  runCountersSummary,
  runDuration,
  runLabel,
  runStartedAt,
  runStatusVariant,
} from "@/lib/integrations"
import type { IntegrationRunSummary, RunKind, RunStatus, RunsQuery } from "@/types/integration"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RunDetailSheet } from "./RunDetailSheet"

const PAGE_SIZE = 20
const ALL = "all"

const KIND_OPTIONS: { value: typeof ALL | RunKind; label: string }[] = [
  { value: ALL, label: "Barcha turlar" },
  { value: "catalog", label: RUN_KIND_LABELS.catalog },
  { value: "offers", label: RUN_KIND_LABELS.offers },
]

const MODE_OPTIONS: { value: typeof ALL | "full" | "delta"; label: string }[] = [
  { value: ALL, label: "To'liq va o'zgarishlar" },
  { value: "full", label: "To'liq" },
  { value: "delta", label: "O'zgarishlar" },
]

const STATUS_OPTIONS: { value: typeof ALL | RunStatus; label: string }[] = [
  { value: ALL, label: "Barcha holatlar" },
  ...(Object.keys(RUN_STATUS_LABELS) as RunStatus[]).map((s) => ({ value: s, label: RUN_STATUS_LABELS[s] })),
]

/** Run log (plan A2): full runs and hourly delta buckets (T30), filterable, paginated. */
export function RunsTable({ connectionId }: { connectionId: string }) {
  const [kind, setKind] = useState<typeof ALL | RunKind>(ALL)
  const [mode, setMode] = useState<typeof ALL | "full" | "delta">(ALL)
  const [status, setStatus] = useState<typeof ALL | RunStatus>(ALL)
  const [page, setPage] = useState(1)
  const [runs, setRuns] = useState<IntegrationRunSummary[]>([])
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openRunId, setOpenRunId] = useState<string | null>(null)
  // Only the latest request may write state (fast filter clicks).
  const requestSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++requestSeq.current
    setLoading(true)
    const query: RunsQuery = { page, limit: PAGE_SIZE }
    if (kind !== ALL) query.kind = kind
    if (mode !== ALL) query.mode = mode
    if (status !== ALL) query.status = status
    const res = await listRunsAction(connectionId, query)
    if (seq !== requestSeq.current) return
    if (res.success) {
      setRuns(res.data.data ?? [])
      setPageCount(Math.max(1, res.data.pagination?.totalPages ?? 1))
      setTotal(res.data.pagination?.total ?? 0)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }, [connectionId, kind, mode, status, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter / page change
    void load()
  }, [load])

  const changeFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(1)
  }

  const columns = useMemo<ColumnDef<IntegrationRunSummary>[]>(
    () => [
      {
        id: "date",
        header: "Sana",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">{formatTashkentDateTime(runStartedAt(row.original))}</span>
        ),
      },
      {
        id: "kind",
        header: "Turi",
        cell: ({ row }) => {
          const run = row.original
          return (
            <div className="flex min-w-40 flex-wrap items-center gap-1.5">
              <span className="font-medium">{RUN_KIND_LABELS[run.kind] ?? run.kind}</span>
              {isBucketRun(run) ? (
                <span className="text-muted-foreground">{runLabel(run)}</span>
              ) : (
                <Badge>To&apos;liq</Badge>
              )}
              {run.dry_run && <Badge variant="outline">Sinov</Badge>}
            </div>
          )
        },
      },
      {
        id: "status",
        header: "Holat",
        cell: ({ row }) => (
          <Badge variant={runStatusVariant(row.original.status)}>
            {RUN_STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        id: "batches",
        header: "Paketlar",
        cell: ({ row }) => <span className="tabular-nums">{runBatches(row.original) ?? "—"}</span>,
      },
      {
        id: "counters",
        header: "Natija",
        cell: ({ row }) => <span className="text-sm">{runCountersSummary(row.original)}</span>,
      },
      {
        id: "duration",
        header: "Davomiyligi",
        cell: ({ row }) => <span className="whitespace-nowrap">{runDuration(row.original) ?? "—"}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setOpenRunId(row.original._id)}>
            Batafsil
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Jurnal</CardTitle>
          <CardDescription>
            To&apos;liq yuborishlar alohida, kichik o&apos;zgarishlar soatlik guruhlanadi.
            {total > 0 && ` Jami: ${total}.`}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} className="gap-1.5 self-start">
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Yangilash
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <FilterSelect label="Turi" value={kind} options={KIND_OPTIONS} onChange={changeFilter(setKind)} />
          <FilterSelect label="To'liq / O'zgarishlar" value={mode} options={MODE_OPTIONS} onChange={changeFilter(setMode)} />
          <FilterSelect label="Holat" value={status} options={STATUS_OPTIONS} onChange={changeFilter(setStatus)} />
        </div>

        {error ? (
          <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="text-destructive">Jurnalni yuklab bo&apos;lmadi: {error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Qayta urinish
            </Button>
          </div>
        ) : !loading && runs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Hali yozuv yo&apos;q. 1C ma&apos;lumot yuborgach bu yerda ko&apos;rinadi.
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={runs}
            pageCount={pageCount}
            currentPage={page}
            onPageChange={setPage}
            isLoading={loading}
          />
        )}
      </CardContent>
      <RunDetailSheet runId={openRunId} onClose={() => setOpenRunId(null)} />
    </Card>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue>{options.find((o) => o.value === value)?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
