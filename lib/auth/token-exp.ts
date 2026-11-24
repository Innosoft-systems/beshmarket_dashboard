/** Whether a JWT's `exp` has passed. A token that cannot be read is not called expired. */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return typeof payload.exp === "number" && payload.exp * 1000 <= now
  } catch {
    return false
  }
}
