const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
] as const

export function validateEnv(): void {
  if (process.env.NODE_ENV !== "production") return

  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`[env] Missing required environment variables: ${missing.join(", ")}`)
  }

  if (process.env.NEXT_PUBLIC_API_URL === "http://localhost:4000") {
    console.warn("[env] NEXT_PUBLIC_API_URL is pointing to localhost in production")
  }
}
