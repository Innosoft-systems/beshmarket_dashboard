"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type Page<T> = { items: T[]; totalPages: number; total: number }

/**
 * Append-as-you-scroll list backed by a server action.
 *
 * The sentinel is observed rather than polled on scroll, and `loadingRef`
 * guards against the observer firing again while a page is still in flight —
 * without it a fast scroll queues several requests for the same page and the
 * list renders duplicates.
 */
export function useInfiniteList<T>({
  initial,
  loadPage,
  getKey,
}: {
  initial: Page<T>
  loadPage: (page: number) => Promise<Page<T> | null>
  getKey: (item: T) => string
}) {
  const [items, setItems] = useState<T[]>(initial.items)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initial.totalPages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const hasMore = page < totalPages

  const loadMore = useCallback(async () => {
    if (loadingRef.current || page >= totalPages) return
    loadingRef.current = true
    setLoading(true)
    setError(null)

    const next = await loadPage(page + 1)
    if (next) {
      setItems(current => {
        // The list is ordered newest-first and can grow while it is being
        // paged, so the same document can arrive on two pages. Key it.
        const seen = new Set(current.map(getKey))
        return [...current, ...next.items.filter(item => !seen.has(getKey(item)))]
      })
      setPage(page + 1)
      setTotalPages(next.totalPages)
    } else {
      setError("Keyingi sahifani yuklab bo'lmadi")
    }

    setLoading(false)
    loadingRef.current = false
  }, [getKey, loadPage, page, totalPages])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      // Start fetching before the sentinel is on screen so the list rarely
      // shows a spinner at all.
      { rootMargin: "320px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  /** Replace everything — used when a filter changes. */
  const reset = useCallback((next: Page<T>) => {
    setItems(next.items)
    setPage(1)
    setTotalPages(next.totalPages)
    setError(null)
  }, [])

  return { items, hasMore, loading, error, sentinelRef, loadMore, reset }
}
