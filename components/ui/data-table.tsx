"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
  isLoading?: boolean
  /** Show a "go to page" input next to the pager. Off by default. */
  enablePageJump?: boolean
}

/**
 * Parse the page-jump input: digits only, clamped to 1..pageCount.
 * Returns null for empty/non-numeric input.
 */
export function parsePageJump(raw: string, pageCount: number): number | null {
  const v = raw.trim()
  if (!/^\d+$/.test(v)) return null
  const n = Number(v)
  if (!Number.isSafeInteger(n)) return Math.max(1, pageCount)
  return Math.min(Math.max(n, 1), Math.max(1, pageCount))
}

export function PageJump({
  pageCount,
  currentPage,
  onPageChange,
  disabled,
}: {
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  const [value, setValue] = React.useState("")
  const target = parsePageJump(value, pageCount)
  const canJump = !disabled && target !== null && target !== currentPage

  if (pageCount <= 1) return null

  const submit = () => {
    if (!canJump || target === null) return
    onPageChange(target)
    setValue("")
  }

  return (
    <form
      className="flex items-center gap-2"
      // min/max stay on the input for the spinner, but native validation would block
      // out-of-range submits; parsePageJump clamps them instead (999 -> last, 0 -> 1).
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={pageCount}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Sahifa"
        aria-label="Sahifa raqami"
        className="h-8 w-20 px-2 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={disabled}
      />
      <Button type="submit" variant="outline" size="sm" disabled={!canJump}>
        O&apos;tish
      </Button>
    </form>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  currentPage,
  onPageChange,
  isLoading,
  enablePageJump = false,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Ma'lumot topilmadi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="text-sm text-muted-foreground">
          Jami sahifalar: {pageCount}
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Oldingi sahifa</span>
          </Button>
          <div className="text-sm font-medium tabular-nums whitespace-nowrap">
            {currentPage} / {pageCount || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= pageCount || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Keyingi sahifa</span>
          </Button>
          {enablePageJump && pageCount > 1 && (
            <>
              <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
              <PageJump
                pageCount={pageCount}
                currentPage={currentPage}
                onPageChange={onPageChange}
                disabled={isLoading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
