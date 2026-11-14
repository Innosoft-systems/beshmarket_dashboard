"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react"
import { PauseCircle, AlertTriangle, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { subscribePlatformMaintenance } from "@/hooks/use-admin-socket"
import {
  disableMaintenanceAction,
  enableMaintenanceAction,
  extendMaintenanceAction,
  getMaintenanceAction,
} from "@/lib/actions/maintenance"
import {
  EXTEND_MINUTES,
  MAX_MESSAGE_LENGTH,
  MAX_PAUSE_MINUTES,
  REASON_OPTIONS,
  buildEnableBody,
  changeReason,
  defaultPauseForm,
  describeHistoryEntry,
  describePause,
  formatCountdown,
  formatDurationLabel,
  formatResumeTime,
  isPauseActive,
  mergeMaintenance,
  parseMaintenanceState,
  reasonLabel,
  reasonOption,
  remainingMs,
  type MaintenanceAdminView,
  type PauseFormState,
} from "@/lib/maintenance"

// ---------------------------------------------------------------------------
// 1-second clock, only while a timed pause is shown. Server snapshot is 0 so
// the countdown renders after hydration (no server/client text mismatch).

let clockNow = 0
function subscribeClock(onTick: () => void) {
  clockNow = Date.now()
  onTick()
  const id = setInterval(() => {
    clockNow = Date.now()
    onTick()
  }, 1000)
  return () => clearInterval(id)
}
const noopSubscribe = () => () => {}
const getClock = () => clockNow
const getServerClock = () => 0

// ---------------------------------------------------------------------------

interface PlatformPauseContextValue {
  view: MaintenanceAdminView | null
  /** Paused right now (client-side expiry at `until` applied once the clock runs). */
  active: boolean
  /** Current time while a timed pause is shown; 0 before the clock starts. */
  now: number
  setView: (v: MaintenanceAdminView) => void
}

const PlatformPauseContext = createContext<PlatformPauseContextValue | null>(null)

function usePlatformPause() {
  const ctx = useContext(PlatformPauseContext)
  if (!ctx) throw new Error("usePlatformPause must be used inside PlatformPauseProvider")
  return ctx
}

export function PlatformPauseProvider({
  initial,
  children,
}: {
  initial: MaintenanceAdminView | null
  children: React.ReactNode
}) {
  const [view, setView] = useState<MaintenanceAdminView | null>(initial)

  const timed = !!view?.active && !!view.until
  const now = useSyncExternalStore(timed ? subscribeClock : noopSubscribe, getClock, getServerClock)
  const active = now > 0 ? isPauseActive(view, now) : !!view?.active

  const refresh = useCallback(async () => {
    const res = await getMaintenanceAction()
    if (res.success) setView(res.data)
  }, [])

  // Another admin (or the expiry cron) changed the pause: apply the payload at
  // once, then refetch the admin view for the audit history.
  useEffect(
    () =>
      subscribePlatformMaintenance((payload) => {
        const next = parseMaintenanceState(payload)
        if (!next) return
        setView((prev) => mergeMaintenance(prev, next))
        void refresh()
      }),
    [refresh],
  )

  // The socket can miss events while the tab sleeps; resync when it is shown again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [refresh])

  const value = useMemo(() => ({ view, active, now, setView }), [view, active, now])
  return <PlatformPauseContext.Provider value={value}>{children}</PlatformPauseContext.Provider>
}

// ---------------------------------------------------------------------------
// Header quick action

export function PlatformPauseButton() {
  const { active } = usePlatformPause()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={active ? "destructive" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={active ? "Pauzani o'zgartirish" : "Platformani pauzaga qo'yish"}
      >
        <PauseCircle className="h-4 w-4" />
        <span className="hidden sm:inline">{active ? "Pauza faol" : "Pauza"}</span>
      </Button>
      {/* Remount on open so the form starts from the defaults every time. */}
      {open && <PauseDialog open={open} onOpenChange={setOpen} />}
    </>
  )
}

export function PauseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { active, setView } = usePlatformPause()
  const [form, setForm] = useState<PauseFormState>(() => defaultPauseForm())
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [error, setError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()

  const built = buildEnableBody(form)
  const opt = reasonOption(form.reason)
  const d = form.duration

  const next = () => {
    if (!built.ok) {
      setError(built.error)
      return
    }
    setError(null)
    setStep("confirm")
  }

  const submit = () => {
    if (!built.ok) return
    startSubmit(async () => {
      const res = await enableMaintenanceAction(built.body)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setView(res.data)
      toast.success("Pauza yoqildi: yangi buyurtmalar qabul qilinmaydi")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{active ? "Pauzani o'zgartirish" : "Platformani pauzaga qo'yish"}</DialogTitle>
          <DialogDescription>
            Pauza vaqtida mijozlar yangi buyurtma bera olmaydi. Joriy buyurtmalar odatdagidek davom etadi.
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Sabab</legend>
              <div className="grid grid-cols-2 gap-2">
                {REASON_OPTIONS.map((r) => (
                  <Button
                    key={r.value}
                    type="button"
                    variant={form.reason === r.value ? "default" : "outline"}
                    aria-pressed={form.reason === r.value}
                    onClick={() => setForm((f) => changeReason(f, r.value))}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Muddat</legend>
              <div className="flex flex-wrap gap-2">
                {opt?.presets.map((m) => {
                  const selected = d.kind === "preset" && d.minutes === m
                  return (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      onClick={() => setForm((f) => ({ ...f, duration: { kind: "preset", minutes: m } }))}
                    >
                      +{formatDurationLabel(m)}
                    </Button>
                  )
                })}
                <Button
                  type="button"
                  size="sm"
                  variant={d.kind === "custom" ? "default" : "outline"}
                  aria-pressed={d.kind === "custom"}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      duration: { kind: "custom", minutes: f.duration.kind === "custom" ? f.duration.minutes : "60" },
                    }))
                  }
                >
                  Boshqa muddat
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={d.kind === "indefinite" ? "default" : "outline"}
                  aria-pressed={d.kind === "indefinite"}
                  onClick={() => setForm((f) => ({ ...f, duration: { kind: "indefinite" } }))}
                >
                  Muddatsiz
                </Button>
              </div>
              {d.kind === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_PAUSE_MINUTES}
                    step={1}
                    value={d.minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration: { kind: "custom", minutes: e.target.value } }))}
                    aria-label="Daqiqa"
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">daqiqa (1–{MAX_PAUSE_MINUTES})</span>
                </div>
              )}
              {d.kind === "indefinite" && (
                <p className="text-xs text-amber-700">
                  Pauza o&apos;zingiz o&apos;chirmaguningizcha davom etadi. Uni bannerdagi tugma bilan o&apos;chirasiz.
                </p>
              )}
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="pause-message">Mijozlar uchun xabar (ixtiyoriy)</Label>
              <Textarea
                id="pause-message"
                value={form.message}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={opt?.defaultMessage}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Bo&apos;sh qoldirilsa standart matn ko&apos;rsatiladi. Matn faqat o&apos;zbekcha saqlanadi; rus va ingliz
                tilidagi mijozlar standart matnni ko&apos;radi. {form.message.trim().length}/{MAX_MESSAGE_LENGTH}
              </p>
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Barcha yangi buyurtmalar to&apos;xtatiladi.</p>
                <p>{built.ok ? describePause(form, built.minutes) : null}</p>
                {active && <p>Joriy pauza shu sozlama bilan almashtiriladi.</p>}
              </div>
            </div>
            {form.message.trim() && (
              <p className="text-sm text-muted-foreground">Xabar: &laquo;{form.message.trim()}&raquo;</p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "form" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Bekor qilish
              </Button>
              <Button onClick={next}>Davom etish</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("form")} disabled={submitting}>
                Orqaga
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Kutilmoqda..." : "Pauzani yoqish"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Red banner while paused

export function PlatformPauseBanner() {
  const { view, active, now, setView } = usePlatformPause()
  const [confirmOff, setConfirmOff] = useState(false)
  const [busy, startBusy] = useTransition()

  if (!view || !active) return null

  const left = now > 0 ? remainingMs(view.until, now) : null
  const who = describeHistoryEntry(view.history?.[0])

  const extend = () =>
    startBusy(async () => {
      const res = await extendMaintenanceAction(EXTEND_MINUTES)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setView(res.data)
      toast.success(`Pauza ${EXTEND_MINUTES} daqiqaga uzaytirildi`)
    })

  const disable = () =>
    startBusy(async () => {
      const res = await disableMaintenanceAction()
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setView(res.data)
      setConfirmOff(false)
      toast.success("Pauza o'chirildi: buyurtmalar yana qabul qilinadi")
    })

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-red-600 px-4 py-2 text-sm text-white"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <PauseCircle className="h-4 w-4 shrink-0" />
        <span className="font-semibold">Platforma pauzada: {reasonLabel(view.reason)}</span>
        <span>
          {view.until ? `soat ${formatResumeTime(view.until, now || undefined)} gacha` : "o'chirilmaguncha"}
        </span>
        {left !== null && (
          <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono tabular-nums" aria-label="Qolgan vaqt">
            {formatCountdown(left)}
          </span>
        )}
        {who && <span className="text-xs text-white/80">({who})</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {view.until && (
          <Button size="sm" variant="secondary" onClick={extend} disabled={busy}>
            <Plus className="h-4 w-4" />
            {EXTEND_MINUTES} daqiqa
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="bg-white text-red-700 hover:bg-red-50"
          onClick={() => setConfirmOff(true)}
          disabled={busy}
        >
          <X className="h-4 w-4" />
          Pauzani bekor qilish
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Pauzani bekor qilish"
        description="Pauza hozir o'chiriladi va mijozlar yana buyurtma bera oladi."
        confirmLabel="Pauzani o'chirish"
        cancelLabel="Ortga"
        variant="default"
        loading={busy}
        onConfirm={disable}
      />
    </div>
  )
}
