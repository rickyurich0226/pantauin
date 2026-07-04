import prisma from './prisma'
import { createNotificationDeduped } from './dedup'

// --- OpenAI embeddings (used when OPENAI_API_KEY is configured) ---
async function embedText(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// --- Fallback when no OpenAI key is set: simple keyword overlap, 0..1 ---
function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || [] as string[]).filter(w => w.length > 2)
}
function keywordScore(query: string, text: string): number {
  const qTokens = tokenize(query)
  const tTokens = tokenize(text)
  if (qTokens.length === 0) return 0
  const q = new Set(qTokens)
  const t = new Set(tTokens)
  // Hitung kata query yang ada di artikel
  let qHits = 0
  q.forEach(w => { if (t.has(w)) qHits++ })
  const queryCoverage = qHits / q.size
  // Minimal kata yang harus cocok scaling dengan panjang query — query lebih panjang butuh lebih banyak overlap
  const minHits = qTokens.length >= 6 ? 4 : qTokens.length >= 3 ? 3 : 2
  if (qHits < minHits) return 0
  // Hitung mutual coverage — kata artikel yang ada di query (konteks relevansi)
  let tHits = 0
  t.forEach(w => { if (q.has(w)) tHits++ })
  const articleCoverage = t.size > 0 ? tHits / t.size : 0
  // Weighted score: 70% dari sisi query, 30% dari sisi artikel
  return queryCoverage * 0.7 + articleCoverage * 0.3
}

async function getSiteThreshold(): Promise<number> {
  try {
    const { readFileSync, existsSync } = require('fs')
    const { join } = require('path')
    const p = join(process.cwd(), 'data', 'site-config.json')
    if (existsSync(p)) {
      const cfg = JSON.parse(readFileSync(p, 'utf-8'))
      if (typeof cfg.match_threshold === 'number') return cfg.match_threshold
    }
  } catch {}
  return 0.72
}

// Matches freshly-ingested ListingItems against active WatchQueries in the
// same category and queues a Notification for anything above threshold.
// Uses OpenAI embeddings when available, otherwise falls back to keyword
// overlap (with a lower, separately-scaled threshold) so the platform keeps
// working end-to-end even before AI is configured.
export async function runMatchingForNewItems(limit = 100) {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const items = await prisma.listingItem.findMany({
    where: {
      OR: [
        { matchedAt: null },
        { publishedAt: { gte: twoHoursAgo }, matchedAt: { lt: twoHoursAgo } }
      ]
    },
    take: limit,
    orderBy: { publishedAt: 'desc' }
  })
  if (!items.length) return { processed: 0, notified: 0 }

  const useAi = !!process.env.OPENAI_API_KEY
  const aiThreshold = await getSiteThreshold()
  const keywordThreshold = 0.45

  let notified = 0
  for (const item of items) {
    const watches = await prisma.watchQuery.findMany({ where: { isActive: true, category: item.category } })
    const itemText = `${item.title}\n${item.description}`
    const itemEmbedding = useAi ? await embedText(itemText) : null

    for (const watch of watches) {
      let score: number
      if (useAi && itemEmbedding) {
        const qEmbedding = await embedText(watch.queryText)
        score = qEmbedding ? cosineSimilarity(qEmbedding, itemEmbedding) : keywordScore(watch.queryText, itemText)
      } else {
        score = keywordScore(watch.queryText, itemText)
      }
      const threshold = (useAi && itemEmbedding) ? aiThreshold : keywordThreshold
      if (score < threshold) continue
      // Advanced filtering: mustInclude (AND) dan exclude (NOT)
      const filters = (watch as any).filters ?? {}
      if (filters.mustInclude) {
        const must = String(filters.mustInclude).toLowerCase()
        const mustWords = must.split(',').map((w: string) => w.trim()).filter(Boolean)
        const itemLower = itemText.toLowerCase()
        if (mustWords.some((w: string) => w && !itemLower.includes(w))) continue
      }
      if (filters.exclude) {
        const excl = String(filters.exclude).toLowerCase()
        const exclWords = excl.split(',').map((w: string) => w.trim()).filter(Boolean)
        const itemLower = itemText.toLowerCase()
        if (exclWords.some((w: string) => w && itemLower.includes(w))) continue
      }

      const notif = await createNotificationDeduped({
        userId: watch.userId,
        watchId: watch.id,
        title: item.title,
        body: item.description.slice(0, 500),
        sourceUrl: item.url,
        sourceId: item.id,
        channel: watch.channels?.[0] ?? 'EMAIL',
        matchScore: score,
        price: item.price ? Number(item.price) : null,
        location: item.location ?? null,
      })
      if (notif) notified++
    }
    await prisma.listingItem.update({ where: { id: item.id }, data: { matchedAt: new Date() } })
  }
  return { processed: items.length, notified }
}
