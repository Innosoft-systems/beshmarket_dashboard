// Only allow relative paths and same-origin URLs to prevent open-redirect / XSS
export function isSafeInternalUrl(url: string | undefined): url is string {
  if (!url) return false
  try {
    // Relative paths are safe
    if (url.startsWith("/") && !url.startsWith("//")) return true
    // Same-origin absolute URLs
    const parsed = new URL(url)
    return parsed.origin === window.location.origin
  } catch {
    return false
  }
}
