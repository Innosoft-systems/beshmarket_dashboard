"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { IntegrationCredentials } from "@/types/integration"

/**
 * Shows the endpoint, login and secret ONCE, right after create / rotate.
 * The parent owns `credentials` and must drop it in `onClose`; this dialog
 * keeps no copy, so after closing the secret exists nowhere in the page.
 * Closing needs the explicit button (no outside click / Escape), so the
 * secret can't be lost by a stray click before it is copied.
 */
export function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: IntegrationCredentials | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={credentials !== null}
      // Only the footer button closes it; Escape / outside press are ignored.
      onOpenChange={() => {}}
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> 1C ulanish ma&apos;lumotlari
          </DialogTitle>
          <DialogDescription>
            Bularni do&apos;konning 1C mutaxassisiga xavfsiz yo&apos;l bilan yuboring.
          </DialogDescription>
        </DialogHeader>

        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Parol faqat hozir ko&apos;rsatiladi. Yopganingizdan keyin uni qayta ko&apos;rib bo&apos;lmaydi, faqat
            yangisini yaratish mumkin.
          </span>
        </div>

        {credentials && (
          <div className="space-y-3">
            <CopyField label="Manzil (endpoint)" value={credentials.endpoint_url} />
            <CopyField label="Login" value={credentials.login} />
            <CopyField label="Parol" value={credentials.secret} />
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Saqlab oldim, yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A value with a copy button (also used for the endpoint on the connection card). */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} nusxalandi`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Nusxalab bo'lmadi, qo'lda belgilab oling")
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md border bg-muted/50 px-2.5 py-2 font-mono text-sm select-all">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label={`${label}ni nusxalash`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
