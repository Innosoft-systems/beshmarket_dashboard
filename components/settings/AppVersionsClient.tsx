"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Smartphone, Save, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { appVersionSchema, type AppVersionFormValues } from "@/schemas/app-version"
import { upsertAppVersionAction, updateAppVersionAction } from "@/lib/actions/app-versions"
import type { AppVersion, AppPlatform } from "@/lib/actions/app-versions"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type Tab = {
  id: AppPlatform
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: "ios-mobile", label: "iOS Mobile", icon: "" },
  { id: "android-mobile", label: "Android Mobile", icon: "" },
  { id: "ios-courier", label: "iOS Courier", icon: "" },
  { id: "android-courier", label: "Android Courier", icon: "" },
]

type ChangelogLang = "uz" | "ru" | "en"

const CHANGELOG_TABS: { id: ChangelogLang; label: string }[] = [
  { id: "uz", label: "UZ" },
  { id: "ru", label: "RU" },
  { id: "en", label: "EN" },
]

function PlatformForm({
  platform,
  existing,
}: {
  platform: AppPlatform
  existing: AppVersion | undefined
}) {
  const [changelogTab, setChangelogTab] = useState<ChangelogLang>("uz")
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppVersionFormValues>({
    resolver: zodResolver(appVersionSchema),
    defaultValues: {
      latestVersion: existing?.latestVersion ?? "",
      minVersion: existing?.minVersion ?? "",
      storeUrl: existing?.storeUrl ?? "",
      changelog: {
        uz: existing?.changelog?.uz ?? "",
        ru: existing?.changelog?.ru ?? "",
        en: existing?.changelog?.en ?? "",
      },
      isActive: existing?.isActive ?? true,
    },
  })

  const isActive = watch("isActive")

  const onSubmit = async (values: AppVersionFormValues) => {
    setSaving(true)
    try {
      let result: { success: boolean; error?: string }

      if (existing?._id) {
        result = await updateAppVersionAction(existing._id, { platform, ...values })
      } else {
        result = await upsertAppVersionAction({ platform, ...values })
      }

      if (result.success) {
        toast.success("Versiya muvaffaqiyatli saqlandi")
      } else {
        toast.error(result.error ?? "Xatolik yuz berdi")
      }
    } catch {
      toast.error("Xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Version fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${platform}-latest`}>
            So'nggi versiya <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${platform}-latest`}
            placeholder="2.1.0"
            {...register("latestVersion")}
            className={cn(errors.latestVersion && "border-destructive")}
          />
          {errors.latestVersion && (
            <p className="text-xs text-destructive">{errors.latestVersion.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${platform}-min`}>
            Minimal versiya <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${platform}-min`}
            placeholder="1.8.0"
            {...register("minVersion")}
            className={cn(errors.minVersion && "border-destructive")}
          />
          {errors.minVersion && (
            <p className="text-xs text-destructive">{errors.minVersion.message}</p>
          )}
        </div>
      </div>

      {/* Store URL */}
      <div className="space-y-2">
        <Label htmlFor={`${platform}-url`}>
          Do'kon havolasi <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${platform}-url`}
          placeholder={
            platform.startsWith("ios")
              ? "https://apps.apple.com/..."
              : "https://play.google.com/store/apps/..."
          }
          {...register("storeUrl")}
          className={cn(errors.storeUrl && "border-destructive")}
        />
        {errors.storeUrl && (
          <p className="text-xs text-destructive">{errors.storeUrl.message}</p>
        )}
      </div>

      {/* Changelog */}
      <div className="space-y-2">
        <Label>O'zgarishlar tarixi (Changelog)</Label>
        <div className="rounded-lg border">
          {/* Changelog lang tabs */}
          <div className="flex border-b">
            {CHANGELOG_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChangelogTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  changelogTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            {CHANGELOG_TABS.map((tab) => (
              <div key={tab.id} className={cn(changelogTab !== tab.id && "hidden")}>
                <Textarea
                  placeholder={`${tab.label} tilida o'zgarishlarni kiriting...`}
                  rows={4}
                  {...register(`changelog.${tab.id}`)}
                  className="resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* isActive toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Faollik holati</p>
          <p className="text-xs text-muted-foreground">
            {isActive
              ? "Ushbu platforma versiyasi faol"
              : "Ushbu platforma versiyasi nofaol"}
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={(val) => setValue("isActive", val)}
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Saqlash
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function AppVersionsClient({ versions }: { versions: AppVersion[] }) {
  const [activeTab, setActiveTab] = useState<AppPlatform>("ios-mobile")

  const versionMap = new Map(versions.map((v) => [v.platform, v]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          Ilova versiyalari
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mobil va kuryer ilovalar uchun versiya talablarini boshqaring
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form card */}
      {TABS.map((tab) => (
        <div key={tab.id} className={cn(activeTab !== tab.id && "hidden")}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tab.label} sozlamalari</CardTitle>
              <CardDescription>
                {versionMap.has(tab.id)
                  ? `Oxirgi yangilanish: ${new Date(versionMap.get(tab.id)!.updatedAt).toLocaleDateString("uz-UZ")}`
                  : "Hali sozlama saqlanmagan"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformForm platform={tab.id} existing={versionMap.get(tab.id)} />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
