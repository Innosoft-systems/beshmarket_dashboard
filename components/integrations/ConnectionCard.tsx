"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { KeyRound, Link2, Loader2, Plug } from "lucide-react"

import {
  createConnectionAction,
  getConnectionAction,
  getConnectionStatusAction,
  rotateSecretAction,
  updateConnectionAction,
} from "@/lib/actions/integrations"
import { PROTOCOL_LABELS, formatTashkentDateTime } from "@/lib/integrations"
import type {
  IntegrationConnection,
  IntegrationCredentials,
  IntegrationProtocol,
  IntegrationStatus,
} from "@/types/integration"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CredentialsDialog } from "./CredentialsDialog"
import { ConnectionSettingsForm } from "./ConnectionSettingsForm"
import { StatusPanel } from "./StatusPanel"

/**
 * Per-venue 1C connection (admin). Owns the connection + status state.
 * The plain secret lives only in `credentials` while the dialog is open and is
 * dropped on close; it is never part of the server-rendered page data.
 */
export function ConnectionCard({
  restaurantId,
  initialConnection,
  initialStatus,
}: {
  restaurantId: string
  initialConnection: IntegrationConnection | null
  initialStatus: IntegrationStatus | null
}) {
  const [connection, setConnection] = useState<IntegrationConnection | null>(initialConnection)
  const [status, setStatus] = useState<IntegrationStatus | null>(initialStatus)
  const [credentials, setCredentials] = useState<IntegrationCredentials | null>(null)
  const [protocol, setProtocol] = useState<IntegrationProtocol>("json")
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [busy, startBusy] = useTransition()
  const [statusLoading, startStatus] = useTransition()

  const loadStatus = (id: string) =>
    startStatus(async () => {
      const res = await getConnectionStatusAction(id)
      if (res.success) {
        setStatus(res.data)
        if (res.data.connection) setConnection(res.data.connection)
      } else {
        toast.error(res.error)
      }
    })

  const create = () =>
    startBusy(async () => {
      const res = await createConnectionAction(restaurantId, protocol)
      if (!res.success) {
        toast.error(res.error)
        // 409: someone already created it; show the existing one.
        if (res.status === 409) {
          const existing = await getConnectionAction(restaurantId)
          if (existing.success && existing.data) setConnection(existing.data)
        }
        return
      }
      setConnection(res.data.connection)
      setCredentials(res.data.credentials)
      toast.success("Ulanish yaratildi")
      loadStatus(res.data.connection._id)
    })

  const rotate = () =>
    startBusy(async () => {
      if (!connection) return
      const res = await rotateSecretAction(connection._id)
      setConfirmRotate(false)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setCredentials(res.data)
      setConnection({ ...connection, login: res.data.login, secret_rotated_at: new Date().toISOString() })
      toast.success("Yangi parol yaratildi, eskisi endi ishlamaydi")
    })

  const setEnabled = (enabled: boolean) =>
    startBusy(async () => {
      if (!connection) return
      const res = await updateConnectionAction(connection._id, { enabled })
      setConfirmDisable(false)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setConnection(res.data)
      toast.success(enabled ? "Ulanish yoqildi" : "Ulanish o'chirildi")
    })

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-5 w-5" /> 1C ulanishi yo&apos;q
          </CardTitle>
          <CardDescription>
            Ulanish yaratilgach, login va parol bir marta ko&apos;rsatiladi. Keyin rejimlarni &quot;Sinov&quot;
            dan boshlang.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label>Protokol</Label>
            <Select value={protocol} onValueChange={(v) => v && setProtocol(v as IntegrationProtocol)}>
              <SelectTrigger className="w-full sm:w-72" aria-label="Protokol">
                <SelectValue>{PROTOCOL_LABELS[protocol]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">{PROTOCOL_LABELS.json}</SelectItem>
                <SelectItem value="commerceml">{PROTOCOL_LABELS.commerceml}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={create} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Ulanish yaratish
          </Button>
        </CardContent>
        <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              1C ulanishi
              <Badge variant={connection.enabled ? "default" : "secondary"}>
                {connection.enabled ? "Yoqilgan" : "O'chirilgan"}
              </Badge>
              <Badge variant="outline">{PROTOCOL_LABELS[connection.protocol]}</Badge>
            </CardTitle>
            <CardDescription className="break-all">
              Login: <span className="font-mono text-foreground">{connection.login}</span>
              {connection.secret_rotated_at && (
                <> · parol: {formatTashkentDateTime(connection.secret_rotated_at)}</>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Not a <label> wrapper: base-ui would then name the switch "Yoqilgan" via aria-labelledby. */}
            <div className="flex items-center gap-2 text-sm">
              <Switch
                checked={connection.enabled}
                disabled={busy}
                onCheckedChange={(v) => (v ? setEnabled(true) : setConfirmDisable(true))}
                aria-label="Ulanishni yoqish"
              />
              <span aria-hidden="true">Yoqilgan</span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirmRotate(true)} disabled={busy}>
              <KeyRound className="h-4 w-4" /> Parolni almashtirish
            </Button>
          </div>
        </CardHeader>
      </Card>

      <StatusPanel
        connection={connection}
        status={status}
        loading={statusLoading}
        onRefresh={() => loadStatus(connection._id)}
      />

      <ConnectionSettingsForm connection={connection} onSaved={setConnection} />

      <ConfirmDialog
        open={confirmRotate}
        onOpenChange={setConfirmRotate}
        title="Parolni almashtirish"
        description="Eski parol darhol ishlamay qoladi. 1C dagi sozlamani yangi parolga almashtirmaguncha sinxronlash to'xtaydi."
        confirmLabel="Almashtirish"
        cancelLabel="Ortga"
        loading={busy}
        onConfirm={rotate}
      />
      <ConfirmDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="Ulanishni o'chirish"
        description="1C dan keladigan so'rovlar rad etiladi. Mahsulotlar o'z holicha qoladi va panelda qo'lda boshqariladi."
        confirmLabel="O'chirish"
        cancelLabel="Ortga"
        loading={busy}
        onConfirm={() => setEnabled(false)}
      />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  )
}
