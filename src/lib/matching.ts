import prisma from './prisma'
import { createNotificationDeduped } from './dedup'
import { scoreV2, passesFiltersV2, loadIdf, titleKey, isNearDuplicate, V2_THRESHOLD } from './matching-v2'

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

const STOP_WORDS = new Set([
  'yang','dan','di','ke','dari','ini','itu','atau','juga','dengan','untuk',
  'pada','adalah','akan','ada','tidak','dalam','oleh','sebagai','tersebut',
  'dapat','saya','kamu','kami','mereka','anda','carikan','tolong','mohon',
  'bisa','sudah','telah','sedang','belum','paling','sangat','lebih','punya',
  'hari','bulan','tahun','lagi','saja','hanya','baru','mau','maka','karena'
])

// Sinonim dan normalisasi kata Indonesia
const SYNONYMS: Record<string, string> = {
  // Properti
  'dijual': 'jual', 'menjual': 'jual', 'penjualan': 'jual', 'dijualkan': 'jual',
  'dibeli': 'beli', 'membeli': 'beli', 'pembelian': 'beli',
  'perumahan': 'rumah', 'hunian': 'rumah', 'properti': 'rumah',
  'kavling': 'tanah', 'lahan': 'tanah', 'persil': 'tanah',
  'tangsel': 'tangerang', 'tangerang selatan': 'tangerang',
  'jaksel': 'jakarta', 'jaktim': 'jakarta', 'jakbar': 'jakarta', 'jakut': 'jakarta',
  'jabar': 'jawa barat', 'jateng': 'jawa tengah', 'jatim': 'jawa timur',
  // Tender
  'pengadaan': 'tender', 'lelang': 'tender', 'prokuremen': 'tender',
  'rekanan': 'kontraktor', 'vendor': 'kontraktor',
  // Bisnis
  'usaha': 'bisnis', 'wirausaha': 'bisnis', 'entrepreneur': 'bisnis',
  'franchise': 'waralaba', 'distributor': 'agen', 'reseller': 'agen',
  // Pekerjaan
  'loker': 'lowongan', 'karir': 'kerja', 'rekrutmen': 'kerja', 'hiring': 'kerja',
  'remote': 'jarak jauh', 'wfh': 'jarak jauh',
  // Kendaraan
  'mobil': 'kendaraan', 'motor': 'kendaraan', 'otomotif': 'kendaraan',
  'bekas': 'second', 'seken': 'second',
  // Investasi
  'saham': 'investasi', 'obligasi': 'investasi', 'reksadana': 'investasi',
  'cuan': 'untung', 'profit': 'untung', 'yield': 'hasil',
}

// Suffix stripping sederhana untuk Bahasa Indonesia
function stemWord(word: string): string {
  // Cek sinonim dulu
  if (SYNONYMS[word]) return SYNONYMS[word]
  // Strip prefix me-, di-, ke-, se-, pe-, ber-, ter-
  const prefixes = ['meng', 'mem', 'men', 'me', 'peng', 'pem', 'pen', 'pe', 'di', 'ke', 'se', 'ber', 'ter', 'per']
  for (const p of prefixes) {
    if (word.startsWith(p) && word.length > p.length + 2) {
      const stem = word.slice(p.length)
      if (stem.length >= 3) return stem
    }
  }
  // Strip suffix -kan, -an, -i, -nya
  const suffixes = ['kan', 'an', 'nya', 'i']
  for (const s of suffixes) {
    if (word.endsWith(s) && word.length > s.length + 2) {
      return word.slice(0, word.length - s.length)
    }
  }
  return word
}

export function tokenize(s: string): string[] {
  const raw = (s.toLowerCase().match(/[a-z]+/g) ?? [] as string[])
  return raw.filter((w: string) => w.length > 2 && !STOP_WORDS.has(w)).map(stemWord)
}
// Kota/daerah besar Indonesia untuk deteksi lokasi pada query
const CITIES = new Set([
  'jakarta','bandung','surabaya','medan','semarang','makassar','palembang',
  'tangerang','depok','bekasi','bogor','malang','yogyakarta','jogja','solo','denpasar','bali',
  'balikpapan','samarinda','pekanbaru','batam','padang','manado','pontianak','banjarmasin',
  'jambi','mataram','kupang','ambon','jayapura','palu','ternate','sorong','kendari','gorontalo',
  'karawang','cikarang','cirebon','sukabumi','tasikmalaya','purwokerto','kediri','madiun',
  'sidoarjo','gresik','jember','banyuwangi','lampung','palangkaraya','bengkulu',
])
// Sinyal yang HAMPIR TIDAK PERNAH menandakan peluang bisnis nyata (investigasi, ramalan, dsb)
const HARD_REJECT_SIGNALS = [
  'korupsi','dugaan','sidang','pengadilan','kpk','polda','tersangka',
  'zodiak','ramalan','horoskop','ditangkap','tilang',
]
function hardRejectHits(text: string): number {
  const tl = text.toLowerCase()
  return HARD_REJECT_SIGNALS.filter(s => tl.includes(s)).length
}
// Ekstrak nama kota yang disebut di query, untuk enforce kecocokan lokasi
export function extractLocationTokens(query: string): Set<string> {
  const ql = query.toLowerCase()
  const found = new Set<string>()
  CITIES.forEach(city => { if (ql.includes(city)) found.add(city) })
  return found
}

// Deteksi apakah teks adalah artikel berita atau listing aktual
function isNewsArticle(text: string): boolean {
  const newsSignals = [
    'pemerintah','kementerian','menteri','presiden','gubernur','bupati','walikota',
    'subsidi','kebijakan','peraturan','undang','regulasi','anggaran','apbn','apbd',
    'korupsi','dugaan','sidang','pengadilan','polisi','polda','kpk',
    'penelitian','riset','survei','laporan','kajian',
    'semester','kuartal','triwulan','tahunan',
    'pandemi','covid','inflasi','resesi','pertumbuhan ekonomi'
  ]
  const textLower = text.toLowerCase()
  const signalHits = newsSignals.filter(s => textLower.includes(s)).length
  return signalHits >= 2
}

// Bonus score untuk listing aktual (bukan artikel berita)
function listingBonus(text: string): number {
  const listingSignals = [
    'dijual','disewakan','dicari','tersedia','stok','ready','indent',
    'hubungi','whatsapp','wa','contact','call','telp','hp',
    'nego','negotiable','harga','rp','juta','miliar',
    'km low','kilometer','cc','manual','automatic',
    'shm','shgb','hgb','imb','sertifikat',
    'luas','m2','meter','kamar','lantai',
    'fresh graduate','ipk','pengalaman','lamaran','cv','resume',
    'deadline','batas','pendaftaran','apply','daftar'
  ]
  const textLower = text.toLowerCase()
  // Kata utuh saja: sebelumnya 'wa' cocok dengan 'siswa', 'rp'/'hp'/'cc' cocok dengan potongan kata apa pun
  const hits = listingSignals.filter(s => new RegExp('(^|[^a-z0-9])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)').test(textLower)).length
  return Math.min(0.3, hits * 0.05)
}

// Niat per kategori: teks wajib memuat minimal 1 kata niat (kata utuh) supaya dianggap peluang.
// Divalidasi lewat simulasi notifikasi 7 hari (28 Sep 2026).
const CATEGORY_INTENT: Record<string, RegExp> = {
  PROPERTI: /\b(dijual|jual|disewakan|sewa|kontrakan|kavling|kaveling|perumahan|properti|kpr|apartemen|ruko|tanah|villa|kost|kos|developer|hunian|residence|residensial|cluster|klaster|townhouse|rusun|rusunawa|perumnas)\b/i,
  LOWONGAN: /\b(lowongan|loker|rekrutmen|rekrut|recruitment|hiring|vacancy|karier|karir|lamaran|penerimaan|seleksi|cpns|pppk|magang|internship|dibutuhkan|job|jobfair|bursa kerja)\b/i,
  TENDER: /\b(tender|lelang|pengadaan|lpse|spse|inaproc|katalog|hps|rup|penyedia|kontrak|paket|proyek|pembangunan|rehabilitasi|revitalisasi)\b/i,
  KONSTRUKSI: /\b(tender|lelang|pengadaan|lpse|spse|proyek|pembangunan|konstruksi|kontraktor|rehabilitasi|renovasi|revitalisasi)\b/i,
  KENDARAAN: /\b(dijual|jual|bekas|second|seken|mobil|motor|truk|kredit|leasing|lelang|dealer)\b/i,
  BARANG: /\b(dijual|jual|grosir|distributor|supplier|stok|promo|diskon|murah|reseller)\b/i,
  BISNIS: /\b(peluang|usaha|bisnis|franchise|waralaba|kemitraan|mitra|umkm|reseller|dropship|modal|investor)\b/i,
  INVESTASI: /\b(saham|reksadana|obligasi|sbn|sukuk|investasi|kripto|crypto|bitcoin|emas|ipo|dividen|deposito)\b/i,
  BEASISWA: /\b(beasiswa|scholarship|fellowship)\b/i,
  BANTUAN: /\b(bantuan|bansos|subsidi|hibah|blt|pkh|kur|insentif)\b/i,
}
function hasCategoryIntent(category: string, text: string): boolean {
  const re = CATEGORY_INTENT[String(category || '').toUpperCase()]
  return re ? re.test(text) : true
}

function keywordScore(query: string, text: string): number {
  // Hard-reject: berita investigasi/ramalan hampir tidak pernah jadi peluang bisnis nyata
  if (hardRejectHits(text) >= 1) return 0
  // Location enforcement: kalau query sebut kota spesifik, listing wajib match kota itu
  const queryCities = extractLocationTokens(query)
  if (queryCities.size > 0) {
    const textLower0 = text.toLowerCase()
    let cityMatch = false
    queryCities.forEach(c => { if (textLower0.includes(c)) cityMatch = true })
    if (!cityMatch) return 0
  }
  const qTokens = tokenize(query)
  const tTokens = tokenize(text)
  if (qTokens.length === 0) return 0
  const q = new Set(qTokens)
  const t = new Set(tTokens)
  let qHits = 0
  q.forEach(w => { if (t.has(w)) qHits++ })
  const minHits = 1
  if (qHits < minHits) return 0
  const queryCoverage = qHits / q.size
  let partialHits = 0
  const textLower = text.toLowerCase()
  q.forEach(w => { if (!t.has(w) && textLower.includes(w)) partialHits++ })
  const partialBonus = partialHits / q.size * 0.2
  let tHits = 0
  t.forEach(w => { if (q.has(w)) tHits++ })
  const articleCoverage = t.size > 0 ? tHits / t.size : 0
  const bonus = listingBonus(text)
  const newsPenalty = isNewsArticle(text) ? 0.25 : 0
  return Math.min(1, queryCoverage * 0.6 + articleCoverage * 0.2 + partialBonus + bonus - newsPenalty)
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

// Ambang skor matching v2 (bisa diubah lewat data/site-config.json: "match_threshold_v2")
function getV2Threshold(): number {
  try {
    const { readFileSync, existsSync } = require('fs')
    const { join } = require('path')
    const p = join(process.cwd(), 'data', 'site-config.json')
    if (existsSync(p)) {
      const cfg = JSON.parse(readFileSync(p, 'utf-8'))
      if (typeof cfg.match_threshold_v2 === 'number') return cfg.match_threshold_v2
    }
  } catch {}
  return V2_THRESHOLD
}

export async function runMatchingForNewItems(limit = 500) {
  // Ambil kategori yang ada watch aktif supaya matching efisien
  const activeWatches = await prisma.watchQuery.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ['category']
  })
  const activeCategories = activeWatches.map((w: any) => w.category)

  // PENTING: hanya proses item yang BELUM pernah di-matchedAt.
  // Sebelumnya query ini juga mengambil ulang item dalam 24 jam terakhir meski
  // sudah pernah diproses, menyebabkan item yang sama di-re-match ke watch yang
  // sama setiap 5 menit selama 24 jam (membanjiri tabel Notification dengan
  // SKIPPED_DUPLICATE dan membuang siklus proses).
  const items = await prisma.listingItem.findMany({
    where: {
      matchedAt: null,
      category: { in: activeCategories as any }
    },
    take: limit,
    orderBy: { createdAt: 'asc' }
  })
  if (!items.length) return { processed: 0, notified: 0 }

  // Pre-load today's notification count per watch (avoid N+1)
  // Hitung awal hari berdasarkan WIB (UTC+7), bukan waktu server (UTC).
  // Tanpa ini, batas 20 notif/hari reset jam 07:00 WIB (tengah malam UTC),
  // bukan tengah malam WIB - membuat limit tercapai lebih awal dari seharusnya.
  const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const todayStart = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate()) - 7 * 60 * 60 * 1000)
  const todayCountMap: Record<string, number> = {}
  for (const w of await prisma.watchQuery.findMany({ where: { isActive: true }, select: { id: true } })) {
    todayCountMap[w.id] = await prisma.notification.count({
      where: { watchId: w.id, sentAt: { gte: todayStart } }
    })
  }

  // Matching v2: bobot kata (IDF) per kategori, dihitung ulang tiap 1 jam dari item 7 hari terakhir
  await loadIdf()
  const v2Threshold = getV2Threshold()
  // Penekan duplikat cerita lintas media: judul yang sudah dikirim ke watch dalam 3 hari terakhir
  const recentKeys: Record<string, string[][]> = {}
  const keysFor = async (watchId: string) => {
    if (!recentKeys[watchId]) {
      const rows = await prisma.notification.findMany({
        where: { watchId, sentAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, status: { in: ['SENT', 'QUEUED'] as any } },
        select: { title: true }, distinct: ['title'], take: 300,
      })
      recentKeys[watchId] = rows.map((r: any) => titleKey(r.title))
    }
    return recentKeys[watchId]
  }

  let notified = 0
  const maxAgeMs = Number(process.env.MAX_ITEM_AGE_DAYS || 3) * 24 * 60 * 60 * 1000
  for (const item of items) {
    // Penjaga kesegaran: item yang terbit terlalu lama (mis. hasil Google News yang tidak kronologis)
    // tetap disimpan & ditandai matchedAt, tapi TIDAK dinotifikasi sebagai 'peluang baru'.
    if (item.publishedAt && Date.now() - new Date(item.publishedAt).getTime() > maxAgeMs) {
      await prisma.listingItem.update({ where: { id: item.id }, data: { matchedAt: new Date() } })
      continue
    }
    const watches = await prisma.watchQuery.findMany({ where: { isActive: true, category: item.category } })
    const itemText = `${item.title}\n${item.description}`

    for (const watch of watches) {
      // Skip artikel yang terbit sebelum watch dibuat
      if (item.publishedAt && watch.createdAt && item.publishedAt < watch.createdAt) continue
      // Limit max 20 notifikasi per watch per hari
      const todayCount = (todayCountMap[watch.id] ?? 0)
      if (todayCount >= 100) continue
      if (!hasCategoryIntent(watch.category, itemText)) continue
      const filters = (watch as any).filters ?? {}
      const v2 = scoreV2(watch.category, watch.queryText, item.title, item.description, filters.learned ?? null)
      const score = v2.score
      if (score < v2Threshold) continue
      if (!passesFiltersV2(filters, item.title, item.description, item.price != null ? Number(item.price) : null)) continue
      // Kabar yang sama dari media lain (judul >=60% sama) tidak dikirim ulang ke watch ini
      const itemKey = titleKey(item.title)
      const sentKeys = await keysFor(watch.id)
      if (sentKeys.some(k => isNearDuplicate(itemKey, k))) continue

      // Ambil user untuk validasi channel yang benar-benar bisa dikirimi
      const watchUser = await prisma.user.findUnique({
        where: { id: watch.userId },
        select: { plan: true, telegramId: true, whatsapp: true, phone: true, whatsappVerified: true, notifChannels: true }
      })
      const isPro = watchUser?.plan !== 'FREE'
      const rawChannels = watch.channels?.length ? watch.channels : ['EMAIL']
      // Filter channel berdasarkan kondisi user:
      // - FREE user hanya EMAIL
      // - TELEGRAM hanya jika user sudah set telegramId
      // - WHATSAPP hanya jika user sudah set whatsapp dan WA API dikonfigurasi
      const channelsToNotify = rawChannels.filter((ch: string) => {
        if (ch === 'EMAIL') return true
        if (ch === 'TELEGRAM') return isPro && !!watchUser?.telegramId
        if (ch === 'WHATSAPP') return isPro && !!watchUser?.whatsappVerified && !!(watchUser?.whatsapp || watchUser?.phone) && !!process.env.HABISIN_API_KEY && !!process.env.HABISIN_SENDER
        return false
      })
      // Batas WA per user per 24 jam: lindungi nomor pengirim dari blokir & cegah spam.
      // Lewat batas -> WA dilepas, dialihkan ke EMAIL supaya match tidak hilang.
      if (channelsToNotify.includes('WHATSAPP')) {
        const waCap = Number(process.env.WA_DAILY_CAP || 10)
        const waSent24h = await prisma.notification.count({ where: { userId: watch.userId, channel: 'WHATSAPP', status: { in: ['QUEUED', 'SENT'] }, sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
        if (waSent24h >= waCap) {
          channelsToNotify.splice(channelsToNotify.indexOf('WHATSAPP'), 1)
          if (!channelsToNotify.includes('EMAIL')) channelsToNotify.push('EMAIL')
        }
      }
      if (channelsToNotify.length === 0) continue
      let anyNotified = false
      for (const ch of channelsToNotify) {
        const notif = await createNotificationDeduped({
          userId: watch.userId,
          watchId: watch.id,
          title: item.title,
          body: item.description.slice(0, 500),
          sourceUrl: item.url,
          sourceId: item.id,
          channel: ch,
          matchScore: score,
          price: item.price ? Number(item.price) : null,
          location: item.location ?? null,
          category: item.category,
        })
        if (notif) anyNotified = true
      }
      if (anyNotified) { notified++; todayCountMap[watch.id] = (todayCountMap[watch.id] ?? 0) + 1; (await keysFor(watch.id)).push(itemKey) }
    }
    await prisma.listingItem.update({ where: { id: item.id }, data: { matchedAt: new Date() } })
  }
  return { processed: items.length, notified }
}
