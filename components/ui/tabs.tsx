"use client"

import { createContext, useContext, useId, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Minimal tabs. Deliberately not a new dependency: the dashboard needs one
 * uncontrolled tab strip, and Radix would arrive with a peer tree for it.
 *
 * Keyboard and ARIA are wired by hand — arrow keys move focus, `role="tab"`
 * and `aria-controls` tie each trigger to its panel — so it behaves like tabs
 * for a screen reader, not just for a mouse.
 */
interface TabsContextValue {
  value: string
  setValue: (value: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs(component: string) {
  const context = useContext(TabsContext)
  if (!context) throw new Error(`<${component}> must be used inside <Tabs>`)
  return context
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const baseId = useId()
  const value = controlled ?? uncontrolled

  const setValue = (next: string) => {
    if (controlled === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  return (
    <TabsContext.Provider value={{ value, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-muted p-1",
        className,
      )}
      onKeyDown={event => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
        const tabs = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
        )
        const index = tabs.indexOf(document.activeElement as HTMLButtonElement)
        if (index === -1) return
        event.preventDefault()
        const step = event.key === "ArrowRight" ? 1 : -1
        tabs[(index + step + tabs.length) % tabs.length].focus()
      }}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const tabs = useTabs("TabsTrigger")
  const active = tabs.value === value

  return (
    <button
      type="button"
      role="tab"
      id={`${tabs.baseId}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${tabs.baseId}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      onClick={() => tabs.setValue(value)}
      onFocus={() => tabs.setValue(value)}
      className={cn(
        "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const tabs = useTabs("TabsContent")
  if (tabs.value !== value) return null

  return (
    <div
      role="tabpanel"
      id={`${tabs.baseId}-panel-${value}`}
      aria-labelledby={`${tabs.baseId}-tab-${value}`}
      className={className}
    >
      {children}
    </div>
  )
}
