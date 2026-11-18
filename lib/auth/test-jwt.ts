// Test helper: an unsigned JWT with the given claims (times in seconds from now).
export function makeJwt(claims: { role?: string; iatAgo?: number; expIn?: number } = {}): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    userId: "u1",
    role: claims.role ?? "restaurant",
    iat: now - (claims.iatAgo ?? 0),
    exp: now + (claims.expIn ?? 900),
  }
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`
}
