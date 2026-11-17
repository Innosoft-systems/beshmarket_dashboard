"use client"

import { useEffect, useRef, useState } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus, Save, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { updateConnectionAction } from "@/lib/actions/integrations"
import {
  CATEGORY_LEVEL_LABELS,
  DAILY_FULL_GRACE_MINUTES,
  MODE_HINTS,
  MODE_LABELS,
  PROTOCOL_LABELS,
  addMinutesHHMM,
  isHHMM,
  liveRefusalTarget,
} from "@/lib/integrations"
import {
  connectionSettingsSchema,
  connectionToForm,
  formToPatch,
  isValidIp,
  MAX_ALLOWED_IPS,
  MIN_LIVE_STOCK_BUFFER,
  type ConnectionSettingsValues,
} from "@/schemas/integration"
import type { IntegrationConnection, IntegrationMode, SeenOneCRef } from "@/types/integration"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const MODES: IntegrationMode[] = ["off", "dry_run", "live"]
/** Select sentinel for "not chosen" (base-ui treats "" as no value). */
const NONE = "__none__"
const NO_DATA = "1C hali ma'lumot yubormagan"

export function ConnectionSettingsForm({
  connection,
  onSaved,
}: {
  connection: IntegrationConnection
  onSaved: (next: IntegrationConnection) => void
}) {
  const [saving, setSaving] = useState(false)
  // Set when the backend refused `live` for a mode (400: B5 / B6 not shipped yet);
  // "Jonli" is then disabled for that mode with the server's reason.
  const [liveBlocked, setLiveBlocked] = useState<{ catalog: string | null; offers: string | null }>({
    catalog: null,
    offers: null,
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ConnectionSettingsValues>({
    resolver: zodResolver(connectionSettingsSchema),
    defaultValues: connectionToForm(connection),
  })

  // What the form was last loaded from. The PATCH diffs against this, not against
  // the `connection` prop, which the status "Yangilash" button can refresh while
  // the form is open: diffing against a fresher prop would send untouched stale
  // values back and revert another admin's change (RV-2b D-2).
  const baselineRef = useRef(connection)

  // A refreshed connection: adopt it when the admin has not started editing;
  // with unsaved edits keep the baseline, so only the edited fields are sent.
  useEffect(() => {
    if (connection === baselineRef.current || isDirty) return
    baselineRef.current = connection
    reset(connectionToForm(connection))
  }, [connection, isDirty, reset])

  const offersMode = useWatch({ control, name: "offers_mode" })
  const dailyFullAt = useWatch({ control, name: "daily_full_at" })

  const onSubmit = async (values: ConnectionSettingsValues) => {
    const baseline = baselineRef.current
    const patch = formToPatch(values, baseline)
    if (Object.keys(patch).length === 0) {
      toast.info("O'zgarish yo'q")
      return
    }
    setSaving(true)
    try {
      const res = await updateConnectionAction(baseline._id, patch)
      if (!res.success) {
        const target = res.status === 400 ? liveRefusalTarget(patch, res.error) : null
        if (target) {
          setLiveBlocked((prev) => ({ ...prev, [target]: res.error }))
          // Put that mode back to its saved value; the rest of the edit stays.
          const field = target === "catalog" ? "catalog_mode" : "offers_mode"
          setValue(field, baseline[field], { shouldDirty: true })
        }
        toast.error(res.error)
        return
      }
      baselineRef.current = res.data
      reset(connectionToForm(res.data))
      onSaved(res.data)
      toast.success("Sozlamalar saqlandi")
    } catch {
      toast.error("Xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  const priceTypes = withUnseen(connection.seen_price_types, [
    connection.retail_price_type_id,
    connection.promo_price_type_id,
  ])
  const warehouses = withUnseen(connection.seen_warehouses, connection.warehouse_ids)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sozlamalar</CardTitle>
        <CardDescription>
          Avval &quot;Sinov&quot; rejimida tekshiring: u mahsulotlarni o&apos;zgartirmaydi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* handleSubmit is called inside the event so the baseline ref is only read on submit. */}
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6" noValidate>
          {/* Modes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ModeField
              control={control}
              name="catalog_mode"
              label="Katalog (mahsulotlar)"
              error={errors.catalog_mode?.message}
              liveBlocked={liveBlocked.catalog}
            />
            <ModeField
              control={control}
              name="offers_mode"
              label="Narx va qoldiq"
              error={errors.offers_mode?.message}
              liveBlocked={liveBlocked.offers}
            />
          </div>

          {/* Price types */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RefSelect
              control={control}
              name="retail_price_type_id"
              label="Chakana narx turi"
              options={priceTypes}
              error={errors.retail_price_type_id?.message}
            />
            <RefSelect
              control={control}
              name="promo_price_type_id"
              label="Aksiya narxi turi (ixtiyoriy)"
              options={priceTypes}
              error={errors.promo_price_type_id?.message}
            />
          </div>

          {/* Warehouses */}
          <Controller
            control={control}
            name="warehouse_ids"
            render={({ field, fieldState }) => (
              <fieldset className="space-y-2" aria-invalid={!!fieldState.error}>
                <legend className="text-sm font-medium">Omborlar</legend>
                {warehouses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{NO_DATA}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {warehouses.map((w) => {
                      const checked = field.value.includes(w.id)
                      return (
                        <label
                          key={w.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={checked}
                            onChange={() =>
                              field.onChange(
                                checked ? field.value.filter((id) => id !== w.id) : [...field.value, w.id],
                              )
                            }
                          />
                          <span className="min-w-0 truncate" title={w.id}>
                            {w.name}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Qoldiq faqat tanlangan omborlar yig&apos;indisidan olinadi. Hech biri tanlanmasa, qoldiq qo&apos;llanmaydi
                  (kuzatilmaydi).
                </p>
                <FieldError message={fieldState.error?.message} />
                {offersMode === "live" && field.value.length === 0 && !fieldState.error && (
                  <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
                    Jonli rejim uchun kamida bitta ombor kerak.
                  </p>
                )}
              </fieldset>
            )}
          />

          {/* Numbers and switches */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="stock_buffer">Qoldiq zaxirasi (dona)</Label>
              <Input
                id="stock_buffer"
                inputMode="numeric"
                {...register("stock_buffer")}
                aria-invalid={!!errors.stock_buffer}
                className={cn(errors.stock_buffer && "border-destructive")}
              />
              <FieldError message={errors.stock_buffer?.message} />
              <p className="text-xs text-muted-foreground">
                Sotuvga qoldiqdan shuncha kam ko&apos;rsatiladi.
                {offersMode === "live" && ` Jonli rejimda kamida ${MIN_LIVE_STOCK_BUFFER}.`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_deactivate_percent">Yashirish chegarasi (%)</Label>
              <Input
                id="max_deactivate_percent"
                inputMode="numeric"
                {...register("max_deactivate_percent")}
                aria-invalid={!!errors.max_deactivate_percent}
                className={cn(errors.max_deactivate_percent && "border-destructive")}
              />
              <FieldError message={errors.max_deactivate_percent?.message} />
              <p className="text-xs text-muted-foreground">
                Bitta sinxronlash bundan ko&apos;p mahsulotni yashirmoqchi bo&apos;lsa, to&apos;xtab tekshiruv so&apos;raydi.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Kategoriya darajasi</Label>
              <Controller
                control={control}
                name="category_level"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full" aria-label="Kategoriya darajasi">
                      <SelectValue>{CATEGORY_LEVEL_LABELS[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">{CATEGORY_LEVEL_LABELS.top}</SelectItem>
                      <SelectItem value="leaf">{CATEGORY_LEVEL_LABELS.leaf}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Protokol</Label>
              <Controller
                control={control}
                name="protocol"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full" aria-label="Protokol">
                      <SelectValue>{PROTOCOL_LABELS[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">{PROTOCOL_LABELS.json}</SelectItem>
                      <SelectItem value="commerceml">{PROTOCOL_LABELS.commerceml}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Controller
              control={control}
              name="new_products_visible"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2 lg:col-span-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="new_products_visible">Yangi mahsulotlar darhol ko&apos;rinsin</Label>
                    <p className="text-xs text-muted-foreground">
                      O&apos;chirilsa, 1C dan kelgan yangi mahsulotlar yashirin holda qo&apos;shiladi.
                    </p>
                  </div>
                  <Switch
                    id="new_products_visible"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v)}
                  />
                </div>
              )}
            />
          </div>

          {/* Schedule (rev 2 heartbeat window, rev 3 daily full) */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Jadval (Toshkent vaqti)</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="daily_full_at">Har kunlik to&apos;liq katalog vaqti</Label>
                <Input
                  id="daily_full_at"
                  type="time"
                  step={60}
                  {...register("daily_full_at")}
                  aria-invalid={!!errors.daily_full_at}
                  className={cn(errors.daily_full_at && "border-destructive")}
                />
                <FieldError message={errors.daily_full_at?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartbeat_from">Aloqa nazorati: boshlanishi</Label>
                <Input
                  id="heartbeat_from"
                  type="time"
                  step={60}
                  {...register("heartbeat_from")}
                  aria-invalid={!!errors.heartbeat_from}
                  className={cn(errors.heartbeat_from && "border-destructive")}
                />
                <FieldError message={errors.heartbeat_from?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartbeat_to">Aloqa nazorati: tugashi</Label>
                <Input
                  id="heartbeat_to"
                  type="time"
                  step={60}
                  {...register("heartbeat_to")}
                  aria-invalid={!!errors.heartbeat_to}
                  className={cn(errors.heartbeat_to && "border-destructive")}
                />
                <FieldError message={errors.heartbeat_to?.message} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              1C har kuni shu vaqtda to&apos;liq katalogni yuboradi (qolgan vaqtda faqat o&apos;zgarishlar).
              {isHHMM(dailyFullAt ?? "") &&
                ` Soat ${addMinutesHHMM(dailyFullAt, DAILY_FULL_GRACE_MINUTES)} gacha kelmasa, ogohlantirish chiqadi.`}{" "}
              Aloqa nazorati oralig&apos;ida 1C 30 daqiqa jim qolsa, aloqa uzilgan deb hisoblanadi.
            </p>
          </fieldset>

          {/* IP allow-list */}
          <Controller
            control={control}
            name="allowed_ips"
            render={({ field }) => (
              <IpListEditor value={field.value} onChange={field.onChange} error={errors.allowed_ips?.message} />
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !isDirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Saqlash
            </Button>
          </div>
          {offersMode === "live" && connection.offers_mode !== "live" && (
            <p className="text-right text-xs text-muted-foreground">
              Jonli narx-qoldiq yoqilgach, narx va qoldiq panelda qo&apos;lda o&apos;zgartirilmaydi.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

/** Seen 1C refs plus any configured id 1C has not reported (yet), so the current value stays visible. */
function withUnseen(seen: SeenOneCRef[] | undefined, ids: (string | null | undefined)[]): { id: string; name: string }[] {
  const list = (seen ?? []).map((s) => ({ id: s.id, name: s.name || s.id }))
  for (const id of ids) {
    if (id && !list.some((x) => x.id === id)) list.push({ id, name: `${id} (1C hozir yubormayapti)` })
  }
  return list
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null
}

type FormControl = Control<ConnectionSettingsValues>

function ModeField({
  control,
  name,
  label,
  error,
  liveBlocked,
}: {
  control: FormControl
  name: "catalog_mode" | "offers_mode"
  label: string
  error?: string
  liveBlocked?: string | null
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <>
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger className="w-full" aria-label={label} aria-invalid={!!error}>
                <SelectValue>{MODE_LABELS[field.value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m} disabled={m === "live" && !!liveBlocked && field.value !== "live"}>
                    {MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{MODE_HINTS[field.value]}</p>
          </>
        )}
      />
      <FieldError message={error} />
      {liveBlocked && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="note">
          &quot;Jonli&quot; hozircha mavjud emas: {liveBlocked}
        </p>
      )}
    </div>
  )
}

function RefSelect({
  control,
  name,
  label,
  options,
  error,
}: {
  control: FormControl
  name: "retail_price_type_id" | "promo_price_type_id"
  label: string
  options: { id: string; name: string }[]
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value || NONE}
            onValueChange={(v) => field.onChange(!v || v === NONE ? "" : v)}
            disabled={options.length === 0}
          >
            <SelectTrigger className="w-full" aria-label={label} aria-invalid={!!error}>
              <SelectValue>
                {options.length === 0
                  ? NO_DATA
                  : (options.find((o) => o.id === field.value)?.name ?? "Tanlanmagan")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Tanlanmagan</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError message={error} />
    </div>
  )
}

/** Allowed source IPs. Empty = any IP (allowed by the contract, not recommended). */
export function IpListEditor({
  value,
  onChange,
  error,
}: {
  value: string[]
  onChange: (next: string[]) => void
  error?: string
}) {
  const [draft, setDraft] = useState("")
  const [draftError, setDraftError] = useState<string | null>(null)

  const add = () => {
    const ip = draft.trim()
    if (!ip) return
    if (!isValidIp(ip)) {
      setDraftError("Noto'g'ri IP manzil (masalan 203.0.113.10 yoki 203.0.113.0/24)")
      return
    }
    if (value.includes(ip)) {
      setDraftError("Bu IP allaqachon ro'yxatda")
      return
    }
    if (value.length >= MAX_ALLOWED_IPS) {
      setDraftError(`Ko'pi bilan ${MAX_ALLOWED_IPS} ta IP manzil`)
      return
    }
    onChange([...value, ip])
    setDraft("")
    setDraftError(null)
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Ruxsat etilgan IP manzillar</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Yangi IP manzil"
          placeholder="203.0.113.10 yoki 203.0.113.0/24"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setDraftError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          className={cn("sm:max-w-xs", draftError && "border-destructive")}
        />
        <Button type="button" variant="outline" onClick={add} className="gap-1.5">
          <Plus className="h-4 w-4" /> Qo&apos;shish
        </Button>
      </div>
      <FieldError message={draftError ?? error} />
      {value.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Ro&apos;yxat bo&apos;sh: istalgan IP dan ulanish mumkin (tavsiya etilmaydi).
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {value.map((ip) => (
            <li key={ip} className="flex items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-2.5 font-mono text-sm">
              {ip}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onChange(value.filter((x) => x !== ip))}
                aria-label={`${ip} ni o'chirish`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
