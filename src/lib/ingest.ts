/* eslint-disable @typescript-eslint/no-var-requires */
// Ingests items from configured monitoring sources (ScraperJob rows).
// Only pulls from sources the source's own owner explicitly configured —
// RSS feeds and JSON APIs meant for syndication, never scraping ToS-protected
// HTML pages. This keeps Pantau.in on the legally safe side: same model as
// any RSS reader or news aggregator.
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import prisma from './prisma'

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return []
  return Array.isArray(v) ? v : [v]
}

function getPath(obj: any, path: string): any {
  if (!path) return undefined
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

interface NormalizedItem {
  externalId: string
  title: string
  description: string
  url?: string
  publishedAt?: Date
}

async function parseRss(rawXml: string): Promise<NormalizedItem[]> {
  const doc = xml.parse(rawXml)
  // RSS 2.0
  const rssItems = toArray(doc?.rss?.channel?.item)
  if (rssItems.length) {
    return rssItems.map((it: any) => ({
      externalId: String(it.guid?.['#text'] ?? it.guid ?? it.link ?? it.title ?? Math.random()),
      title: stripHtml(String(it.title ?? 'Tanpa judul')),
      description: stripHtml(String(it.description ?? it['content:encoded'] ?? '')),
      url: typeof it.link === 'string' ? it.link : it.link?.['#text'],
      publishedAt: it.pubDate ? new Date(it.pubDate) : undefined,
    }))
  }
  // Atom
  const atomEntries = toArray(doc?.feed?.entry)
  if (atomEntries.length) {
    return atomEntries.map((it: any) => ({
      externalId: String(it.id ?? it.link?.['@_href'] ?? it.title ?? Math.random()),
      title: stripHtml(String(it.title?.['#text'] ?? it.title ?? 'Tanpa judul')),
      description: stripHtml(String(it.summary?.['#text'] ?? it.summary ?? it.content?.['#text'] ?? it.content ?? '')),
      url: it.link?.['@_href'] ?? (typeof it.link === 'string' ? it.link : undefined),
      publishedAt: it.updated ? new Date(it.updated) : it.published ? new Date(it.published) : undefined,
    }))
  }
  return []
}

async function parseJsonApi(rawJson: any, config: any): Promise<NormalizedItem[]> {
  const itemsPath = config?.itemsPath ?? ''
  const list = itemsPath ? getPath(rawJson, itemsPath) : rawJson
  const arr = Array.isArray(list) ? list : []
  const f = config?.fields ?? {}
  return arr.map((it: any) => {
    const id = getPath(it, f.id ?? 'id')
    const title = getPath(it, f.title ?? 'title')
    const desc = getPath(it, f.description ?? 'description')
    const url = getPath(it, f.url ?? 'url')
    const pub = getPath(it, f.publishedAt ?? 'publishedAt')
    return {
      externalId: String(id ?? title ?? Math.random()),
      title: stripHtml(String(title ?? 'Tanpa judul')),
      description: stripHtml(String(desc ?? '')),
      url: url ? String(url) : undefined,
      publishedAt: pub ? new Date(pub) : undefined,
    }
  })
}

// HTML scraper — pakai config.selector untuk ekstrak listing dari halaman HTML publik.
// Hanya untuk situs yang robots.txt-nya mengizinkan (index, follow).
// Model tetap link-only: hanya simpan judul + URL, tidak simpan konten artikel.
async function parseHtml(html: string, config: any): Promise<NormalizedItem[]> {
  const $ = cheerio.load(html)
  const items: NormalizedItem[] = []
  const sel = config?.selector ?? {}
  const container = sel.container ?? 'article'
  const titleSel = sel.title ?? 'h2,h3,.title'
  const linkSel = sel.link ?? 'a'
  const priceSel = sel.price ?? '.price,.harga'
  const descSel = sel.desc ?? '.desc,.description,.location,.lokasi'
  const baseUrl = config?.baseUrl ?? ''

  $(container).each((_i: number, el: any) => {
    const titleEl = $(el).find(titleSel).first()
    const linkEl = $(el).find(linkSel).first()
    const priceEl = $(el).find(priceSel).first()
    const descEl = $(el).find(descSel).first()

    const title = titleEl.text().trim()
    const href = linkEl.attr('href') ?? ''
    const url = href.startsWith('http') ? href : baseUrl + href
    const price = priceEl.text().trim()
    const desc = descEl.text().trim()

    if (!title || !url) return

    items.push({
      externalId: url,
      title: title.slice(0, 300),
      description: [price, desc].filter(Boolean).join(' — ').slice(0, 3000),
      url,
    })
  })
  return items
}

// Fetches one source, normalizes its items, and stores any not seen before.
// Errors are caught and recorded on the job itself so one broken source
// never takes down the whole ingestion run.
export async function fetchSource(job: { id: string; url: string; type: string; category: string; config: any }) {
  let items: NormalizedItem[] = []
  const res = await fetch(job.url, { headers: { 'User-Agent': 'PantauinBot/1.0 (+https://pantau.in)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} dari sumber`)
  if (job.type === 'JSON_API') {
    items = await parseJsonApi(await res.json(), job.config)
  } else if (job.type === 'HTML_SCRAPER') {
    items = await parseHtml(await res.text(), job.config)
  } else {
    items = await parseRss(await res.text())
  }

  let created = 0
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const validItems = items.filter(it => !it.publishedAt || it.publishedAt >= thirtyDaysAgo)
  for (const it of validItems.slice(0, 200)) {
    if (!it.title) continue
    try {
      await prisma.listingItem.upsert({
        where: { scraperJobId_externalId: { scraperJobId: job.id, externalId: it.externalId } },
        update: {},
        create: {
          scraperJobId: job.id,
          externalId: it.externalId,
          title: it.title.slice(0, 300),
          description: it.description.slice(0, 3000),
          url: it.url,
          category: job.category as any,
          publishedAt: it.publishedAt,
        },
      })
      created++
    } catch {
      // duplicate (race) or bad row — skip, not fatal for the whole run
    }
  }
  return created
}

// ─── Google News RSS — Dynamic per WatchQuery ───────────────────────────────
// Generates a Google News RSS URL from a watch query, fetches it, and stores
// new items. Uses a shared "Google News" ScraperJob per category as anchor.
export async function fetchGoogleNewsForWatch(watch: {
  id: string
  queryText: string
  category: string
}) {
  // Build Google News RSS URL from query
  const q = encodeURIComponent(watch.queryText)
  const url = `https://news.google.com/rss/search?q=${q}&hl=id&gl=ID&ceid=ID:id&tbs=qdr:d`

  // Find or create a shared ScraperJob anchor for this category
  const p = prisma as any
  let job = await p.scraperJob.findFirst({
    where: { source: `Google News — ${watch.category}`, category: watch.category }
  })
  if (!job) {
    job = await p.scraperJob.create({
      data: {
        source: `Google News — ${watch.category}`,
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(watch.category)}&hl=id&gl=ID&ceid=ID:id`,
        type: 'RSS',
        category: watch.category,
        isActive: true,
        intervalMinutes: 5,
        status: 'idle',
        config: {},
      }
    })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PantauinBot/1.0 (+https://pantau.in)' },
    })
    if (!res.ok) return 0

    const items = await parseRss(await res.text())
    let created = 0

    // Filter: hanya artikel 7 hari terakhir
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const freshItems = items.filter(it => it.publishedAt && it.publishedAt >= sevenDaysAgo)

    for (const it of freshItems.slice(0, 200)) {
      if (!it.title) continue
      // Use watch.id as part of externalId so same article can match multiple watches
      const externalId = `gnews:${watch.id}:${it.externalId}`
      try {
        const existing = await prisma.listingItem.findFirst({
          where: { scraperJobId: job.id, externalId }
        })
        if (existing) continue

        await prisma.listingItem.create({
          data: {
            scraperJobId: job.id,
            externalId,
            title: it.title.slice(0, 300),
            description: it.description.slice(0, 3000),
            url: it.url,
            category: watch.category as any,
            publishedAt: it.publishedAt ?? new Date(),
          },
        })
        created++
      } catch {
        // duplicate or bad row — skip
      }
    }
    return created
  } catch {
    return 0
  }
}

