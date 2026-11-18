/** Full page navigation (a separate module so tests can observe it). */
export function hardNavigate(url: string): void {
  window.location.href = url
}
