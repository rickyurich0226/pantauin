interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Cleanup stale entries periodically to prevent memory growth on long-running process.
// Using forEach instead of for...of on Map.entries() for ES5 target compatibility
// (project tsconfig.json targets es5, downlevelIteration not enabled).
setInterval(() => {
  const now = Date.now()
  const staleKeys: string[] = []
  store.forEach((entry, key) => {
    if (now > entry.resetAt) staleKeys.push(key)
  })
  staleKeys.forEach((key) => store.delete(key))
}, 5 * 60 * 1000).unref?.()

export function rateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

// Per spec section 3.2: endpoint umum 60 req/menit per IP, login 5 req/menit per IP.
export const RATE_LIMITS = {
  LOGIN:        { limit: 5,   windowMs: 60 * 1000 },        // diperketat dari 5/15mnt -> 5/menit per spec, ditambah window 15mnt sebagai secondary guard
  LOGIN_STRICT: { limit: 5,   windowMs: 15 * 60 * 1000 },   // secondary guard: 5 percobaan / 15 menit (account lockout protection)
  REGISTER:     { limit: 3,   windowMs: 60 * 60 * 1000 },
  PAYMENT:      { limit: 10,  windowMs: 60 * 60 * 1000 },
  WATCH_CREATE: { limit: 20,  windowMs: 60 * 60 * 1000 },
  API_GENERAL:  { limit: 60,  windowMs: 60 * 1000 },        // 60 req/menit per spec 3.2
}
