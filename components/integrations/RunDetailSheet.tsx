"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

import { getRunAction } from "@/lib/actions/integrations"
import {
  ERROR_CODE_LABELS,
  RUN_KIND_LABELS,
  RUN_STATUS_LABELS,
  errorCodeCounts,
  formatTashkentDateTime,
  isWarningCode,
  isBucketRun,
  runBatches,
  runDuration,
  runLabel,
  runStartedAt,
  runStatusVariant,
} from "@/lib/integrations"
import type { IntegrationRun } from "@/types/integration"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DiffPreview } from "./DiffPreview"

const ALL_CODES = "__all__"

const COUNTERS: [keyof NonNullable<IntegrationRun["counters"]>, string][] = [
  ["accepted", "Qabul qilindi"],
  ["created", "Yangi"],
  ["updated", "Yangilandi"],
  ["unchanged", "O'zgarmadi"],
  ["deactivated", "Yashirildi"],
  ["reactivated", "Qaytdi"],
  ["rejected", "Xato"],
  ["skipped", "O'tkazib yuborildi"],
  ["images_saved", "Rasm saqlandi"],
  ["images_failed", "Rasm xatosi"],
]

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; run: IntegrationRun }

/** One run: counters, errors (filterable by code), dry-run diff preview, T8 banner. */
export function RunDetailSheet({ runId, onClose }: { runId: string | null; onClose: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [code, setCode] = useState(ALL_CODES)

  useEffect(() => {
    if (!runId) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before fetching another run
    setState({ status: "loading" })
    setCode(ALL_CODES)
    void getRunAction(runId).then((res) => {
      if (cancelled) return
      setState(res.success ? { status: "ready", run: res.data } : { status: "error", message: res.error })
    })
    return () => {
      cancelled = true
    }
  }, [runId])

  return (
    <Sheet open={runId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full data-[side=right]:sm:max-w-2xl">
        {state.status === "loading" && (
          <>
            <SheetHeader>
              <SheetTitle>Yozuv</SheetTitle>
            </SheetHeader>
            <p className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
            </p>
          </>
        )}
        {state.status === "error" && (
          <>
            <SheetHeader>
              <SheetTitle>Yozuv</SheetTitle>
            </SheetHeader>
            <p className="px-4 text-sm text-destructive">Yuklab bo&apos;lmadi: {state.message}</p>
          </>
        )}
        {state.status === "ready" && <RunDetail run={state.run} code={code} onCode={setCode} />}
      </SheetContent>
    </Sheet>
  )
}

function RunDetail({ run, code, onCode }: { run: IntegrationRun; code: string; onCode: (c: string) => void }) {
  const errors = useMemo(() => run.errors ?? [], [run.errors])
  const codes = useMemo(() => errorCodeCounts(errors), [errors])
  const shown = code === ALL_CODES ? errors : errors.filter((e) => e.code === code)
  const warningCount = errors.filter((e) => isWarningCode(e.code)).length
  const bucket = isBucketRun(run)
  const batches = runBatches(run)

  return (
    <div className="space-y-5 px-4 pb-6">
      <SheetHeader className="px-0">
        <SheetTitle className="flex flex-wrap items-center gap-2">
          {RUN_KIND_LABELS[run.kind] ?? run.kind}
          {bucket ? <span className="font-normal text-muted-foreground">{runLabel(run)}</span> : <Badge>To&apos;liq</Badge>}
          {run.dry_run && <Badge variant="outline">Sinov</Badge>}
          <Badge variant={runStatusVariant(run.status)}>{RUN_STATUS_LABELS[run.status] ?? run.status}</Badge>
        </SheetTitle>
        <SheetDescription>
          {formatTashkentDateTime(runStartedAt(run))}
          {runDuration(run) && ` · ${runDuration(run)}`}
          {batches && ` · ${batches} paket`}
          {run.source_ip && ` · IP ${run.source_ip}`}
        </SheetDescription>
      </SheetHeader>

      {run.status === "needs_review" && (
        <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-destructive">Tekshirish kerak: mahsulotlar yashirilmadi</p>
            <p>
              Bu to&apos;liq yuborish 1C dan kelgan faol mahsulotlarning belgilangan chegaradan (sozlamalardagi
              &quot;Yashirish chegarasi&quot;) ko&apos;pini yashirmoqchi bo&apos;ldi. Xato filtr bo&apos;lishi mumkinligi uchun
              yashirish bajarilmadi. 1C dagi tanlovni tekshiring va to&apos;liq yuborishni qayta so&apos;rang.
            </p>
          </div>
        </div>
      )}

      <section aria-label="Hisoblagichlar">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {COUNTERS.map(([key, label]) => (
            <div key={key} className="rounded-md border bg-muted/30 p-2">
              <dt className="truncate text-xs text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums">{(run.counters?.[key] ?? 0).toLocaleString("ru-RU")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Xatolar" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Xatolar ({errors.length})</h3>
          {codes.length > 1 && (
            <Select value={code} onValueChange={(v) => v && onCode(v)}>
              <SelectTrigger size="sm" className="w-full sm:w-64" aria-label="Xato kodi bo'yicha">
                <SelectValue>
                  {code === ALL_CODES ? `Barcha kodlar (${errors.length})` : `${code} (${shown.length})`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CODES}>Barcha kodlar ({errors.length})</SelectItem>
                {codes.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {warningCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {`Ulardan ${warningCount} tasi ogohlantirish: mahsulot qabul qilingan, faqat ko'rsatilgan qism qo'llanmagan.`}
          </p>
        )}
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Xato yo&apos;q.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>1C ID</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Maydon</TableHead>
                  <TableHead>Xabar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((e, i) => (
                  <TableRow key={`${e.external_id ?? "none"}-${e.code}-${i}`}>
                    <TableCell className="max-w-40 font-mono text-xs break-all whitespace-normal">
                      {e.external_id ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="font-mono text-xs">{e.code}</span>
                      {isWarningCode(e.code) && (
                        <Badge variant="outline" className="ml-1.5 px-1 py-0 text-[10px]">
                          Ogohlantirish
                        </Badge>
                      )}
                      {ERROR_CODE_LABELS[e.code] && (
                        <span className="block text-xs text-muted-foreground">{ERROR_CODE_LABELS[e.code]}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.field ?? "—"}</TableCell>
                    <TableCell className="min-w-48 text-sm break-words whitespace-normal">
                      {e.message}
                      {e.batch_no !== undefined && !bucket && (
                        <span className="block text-xs text-muted-foreground">{e.batch_no}-paket</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {errors.length >= 200 && (
          <p className="text-xs text-muted-foreground">Faqat birinchi 200 ta xato saqlanadi.</p>
        )}
      </section>

      <section aria-label="O'zgarishlar namunasi" className="space-y-2">
        <h3 className="text-sm font-semibold">O&apos;zgarishlar namunasi</h3>
        <DiffPreview items={run.diff_sample} dryRun={run.dry_run} />
      </section>
    </div>
  )
}
