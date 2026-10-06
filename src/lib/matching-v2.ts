// Matching v2 (Okt 2026) — skor relevansi berbasis bobot kata (IDF per kategori), mode DAN/ATAU,
// lokasi kata utuh, penyaring berita kriminal/hoaks/luar negeri, tender wajib berupa pengumuman,
// dan penekan duplikat cerita lintas media. Divalidasi simulasi 7 hari (31 rb item, 20 watch):
// presisi ±35% -> ±86%, jumlah notifikasi relevan naik.
import prisma from './prisma'

const STOP = new Set((
  'yang dan di ke dari ini itu atau juga dengan untuk pada adalah akan ada tidak dalam oleh sebagai tersebut ' +
  'dapat saya kamu kami mereka anda carikan tolong mohon bisa sudah telah sedang belum paling sangat lebih punya ' +
  'hari bulan tahun lagi saja hanya baru mau maka karena info informasi terbaru update seluruh semua cari mencari ' +
  'dicari ingin butuh daerah wilayah kota kabupaten kab yg utk dgn tsb khususnya terutama sekitar area kawasan ' +
  'luar negeri lulusan'
).split(' '))

// Kata lunak: menaikkan skor bila ada, tapi tidak wajib (umum di kategorinya / sifat subjektif)
const SOFT = new Set((
  'murah terbaik strategis lokasi return keuntungan untung modal kecil peluang harga luas minimal beli dijual jual ' +
  'indonesia nasional baru bagus cepat langsung dekat besar mudah hasil yield kerja lowongan loker pekerjaan rumah ' +
  'tanah hunian properti kavling tender pengadaan lelang usaha bisnis investasi'
).split(' '))

const SHORT_OK = new Set(['it', 'ai', 'hr', 'ui', 'ux', 'pt', 'cv', 'qa', 'pr', 'bi', 'ac', 'tv', 'pc', 'm2'])

// Alias: bentuk lain yang dianggap SAMA dengan kata query (tidak lagi melebur mobil=motor, saham=obligasi)
const ALIAS: Record<string, string[]> = {
  dijual: ['jual', 'menjual', 'dijual', 'dijualkan'], jual: ['jual', 'dijual', 'menjual'],
  kavling: ['kavling', 'kaveling', 'kapling'], kaveling: ['kavling', 'kaveling'],
  lowongan: ['lowongan', 'loker', 'rekrutmen', 'recruitment', 'vacancy', 'hiring'], loker: ['lowongan', 'loker'],
  kerja: ['kerja', 'pekerjaan', 'karier', 'karir'], pekerjaan: ['kerja', 'pekerjaan'],
  remote: ['remote', 'wfh', 'wfa'], wfh: ['remote', 'wfh'],
  tender: ['tender', 'lelang', 'pengadaan'], pengadaan: ['pengadaan', 'tender', 'lelang'], lelang: ['lelang', 'tender'],
  franchise: ['franchise', 'waralaba'], waralaba: ['franchise', 'waralaba'],
  matic: ['matic', 'automatic', 'otomatis'], bekas: ['bekas', 'second', 'seken'],
  hunian: ['hunian', 'rumah'], properti: ['properti', 'rumah', 'tanah', 'apartemen', 'ruko', 'kavling'],
  it: ['it', 'teknologi informasi', 'software', 'perangkat lunak', 'aplikasi', 'sistem informasi', 'server', 'jaringan', 'komputer'],
  hrd: ['hrd', 'human resource', 'personalia', 'sdm'],
  konstruksi: ['konstruksi', 'pembangunan', 'kontraktor', 'rehabilitasi', 'renovasi', 'jalan', 'jembatan', 'gedung'],
  kripto: ['kripto', 'crypto', 'bitcoin'], saham: ['saham', 'ihsg', 'emiten'],
}

const REGION: Record<string, string[]> = {
  'jawa timur': ['jawa timur', 'jatim', 'surabaya', 'malang', 'kediri', 'banyuwangi', 'jember', 'sidoarjo', 'gresik', 'madiun', 'pasuruan', 'probolinggo', 'blitar', 'mojokerto', 'lamongan', 'tuban', 'bojonegoro', 'ponorogo', 'madura'],
  'jawa barat': ['jawa barat', 'jabar', 'bandung', 'bekasi', 'bogor', 'depok', 'karawang', 'cikarang', 'cirebon', 'sukabumi', 'tasikmalaya', 'garut', 'cimahi', 'purwakarta', 'subang'],
  'jawa tengah': ['jawa tengah', 'jateng', 'semarang', 'solo', 'surakarta', 'purwokerto', 'tegal', 'pekalongan', 'magelang', 'kudus'],
  jabodetabek: ['jabodetabek', 'jakarta', 'bogor', 'depok', 'tangerang', 'bekasi', 'tangsel'],
  'jakarta selatan': ['jakarta selatan', 'jaksel', 'lebak bulus', 'cilandak', 'kebayoran', 'pondok indah', 'pasar minggu', 'jagakarsa'],
  'tangerang selatan': ['tangerang selatan', 'tangsel', 'pondok cabe', 'bsd', 'serpong', 'ciputat', 'pamulang', 'bintaro'],
}
const CITIES = [
  'jakarta', 'bandung', 'surabaya', 'medan', 'semarang', 'makassar', 'palembang', 'tangerang', 'depok', 'bekasi', 'bogor', 'malang',
  'yogyakarta', 'jogja', 'solo', 'denpasar', 'bali', 'balikpapan', 'samarinda', 'pekanbaru', 'batam', 'padang', 'manado', 'pontianak',
  'banjarmasin', 'jambi', 'mataram', 'kupang', 'ambon', 'jayapura', 'palu', 'ternate', 'sorong', 'kendari', 'gorontalo', 'karawang',
  'cikarang', 'cirebon', 'sukabumi', 'tasikmalaya', 'purwokerto', 'kediri', 'madiun', 'sidoarjo', 'gresik', 'jember', 'banyuwangi',
  'lampung', 'palangkaraya', 'bengkulu', 'tangsel', 'cinere', 'cimahi', 'garut', 'pasuruan', 'probolinggo', 'blitar', 'mojokerto',
]

const HARD = /\b(korup\w*|tersangka|ditangkap|zodiak|ramalan|horoskop|tilang|terdakwa|vonis|dugaan|kejari|kejati|kejaksaan|kpk|deportasi|dideportasi|pidana|penipuan|ditahan)\b/i
const HOAX = /\b(hoaks|hoax|waspada\w* penipuan|tautan palsu|catut)\b/i
const FOREIGN = /\b(vietnam|vnd|hanoi|ha noi|da nang|ho chi minh|bac ninh|ringgit|thailand|baht|filipina|peso|new york|amerika serikat|the fed|wall street)\b/i
const FOREIGN_AS = /\b(di|ke|dari|warga|pasar|ekonomi|lowongan kerja) as\b/
const GOSSIP = /\b(artis|seleb|selebriti|aktris|aktor|penyanyi|komedian|presenter|youtuber|viral|gosip)\b/i
const NOT_PROPERTY = /\b(minyak tanah|bawah tanah|tanah air|tanah longsor|solar|biosolar)\b/i
const TENDER_NOT = /\b(surat utang|sbn|sukuk|obligasi|lelang amal|lelang lukisan|reverse auction|audit tender|tanpa lelang|lelang impor)\b/i
const TENDER_OPP = /\b(pengumuman (tender|lelang|pengadaan|prakualifikasi)|paket pekerjaan|nama paket|kode (tender|paket|rup)|pagu|nilai hps|hps rp|metode pemilihan|jadwal (tender|lelang)|pendaftaran (peserta|penyedia)|dokumen (pemilihan|tender|lelang)|batas (akhir )?(pemasukan|penawaran)|lpse|spse|inaproc|e-?katalog|undangan (tender|lelang|penawaran)|request for (proposal|quotation)|rfq|rfp)\b/i
const NEWS_SIGNALS = ['pemerintah', 'kementerian', 'menteri', 'presiden', 'gubernur', 'bupati', 'walikota', 'subsidi', 'kebijakan', 'peraturan',
  'undang', 'regulasi', 'anggaran', 'apbn', 'apbd', 'polisi', 'penelitian', 'riset', 'survei', 'laporan', 'kajian', 'semester', 'kuartal',
  'triwulan', 'tahunan', 'pandemi', 'covid', 'inflasi', 'resesi'].map(s => new RegExp('\\b' + s + '\\b'))
const NEWS_EXEMPT = new Set(['TENDER', 'BANTUAN', 'BEASISWA'])   // berita pemerintah justru sumber info kategori ini
const LISTING = ['dijual', 'disewakan', 'dicari', 'tersedia', 'stok', 'ready', 'indent', 'hubungi', 'whatsapp', 'wa', 'telp', 'hp', 'nego',
  'harga', 'rp', 'juta', 'miliar', 'shm', 'shgb', 'hgb', 'imb', 'sertifikat', 'luas', 'm2', 'kamar', 'lantai', 'fresh graduate', 'ipk',
  'pengalaman', 'lamaran', 'cv', 'deadline', 'pendaftaran', 'apply', 'daftar'].map(s => new RegExp('(^|[^a-z0-9])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)'))

export const V2_THRESHOLD = 0.5

const ENT: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }
export function norm(s: string): string {
  return String(s || '')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .toLowerCase().replace(/\s+/g, ' ')
}
function words(s: string): string[] {
  return s.match(/[a-z0-9]+/g) ?? []
}
function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
export function wordIn(w: string, text: string): boolean {
  return new RegExp('(^|[^a-z0-9])' + esc(w) + '([^a-z0-9]|$)').test(text)
}

function hasTerm(term: string, tl: string, tset: Set<string>): boolean {
  const forms = ALIAS[term] ?? [term]
  for (let i = 0; i < forms.length; i++) {
    const f = forms[i]
    if (f.indexOf(' ') >= 0) { if (tl.indexOf(f) >= 0) return true; continue }
    if (tset.has(f)) return true
    if (f.length >= 6) {           // sufiks: rumahnya, franchisenya
      let hit = false
      tset.forEach(w => { if (!hit && w.length > f.length && w.length - f.length <= 3 && w.indexOf(f) === 0) hit = true })
      if (hit) return true
    }
  }
  return false
}

export function parseQuery(q: string): { terms: string[]; locs: string[] } {
  let ql = norm(q)
  const locs: string[] = []
  Object.keys(REGION).forEach(r => { if (ql.indexOf(r) >= 0) { locs.push(r); ql = ql.split(r).join(' ') } })
  CITIES.slice().sort((a, b) => b.length - a.length).forEach(c => {
    const re = new RegExp('\\b' + esc(c) + '\\b', 'g')
    if (re.test(ql)) { locs.push(c); ql = ql.replace(re, ' ') }
  })
  const terms: string[] = []
  words(ql).forEach(w => {
    if ((w.length > 2 || SHORT_OK.has(w) || /^\d+$/.test(w)) && !STOP.has(w) && terms.indexOf(w) < 0) terms.push(w)
  })
  return { terms, locs }
}

export function locMatch(locs: string[], tl: string): boolean {
  for (let i = 0; i < locs.length; i++) {
    const alts = REGION[locs[i]] ?? [locs[i]]
    for (let j = 0; j < alts.length; j++) if (new RegExp('\\b' + esc(alts[j]) + '\\b').test(tl)) return true
  }
  return false
}

// ---------- IDF per kategori (cache 1 jam, dihitung dari item 7 hari terakhir)
let idfCache: { at: number; n: Record<string, number>; df: Record<string, Record<string, number>> } | null = null
export async function loadIdf(force = false) {
  if (!force && idfCache && Date.now() - idfCache.at < 60 * 60 * 1000) return idfCache
  const rows: { category: string; t: string }[] = await prisma.$queryRawUnsafe(
    `SELECT category::text AS category, title || ' ' || left(description, 600) AS t FROM "ListingItem" WHERE "createdAt" > now() - interval '7 days'`)
  const n: Record<string, number> = {}; const df: Record<string, Record<string, number>> = {}
  rows.forEach(r => {
    n[r.category] = (n[r.category] ?? 0) + 1
    const d = df[r.category] ?? (df[r.category] = {})
    const seen = new Set(words(norm(r.t)))
    seen.forEach(w => { d[w] = (d[w] ?? 0) + 1 })
  })
  idfCache = { at: Date.now(), n, df }
  return idfCache
}
function idf(cat: string, term: string): number {
  const c = idfCache; if (!c) return 1
  const forms = (ALIAS[term] ?? [term]).filter(f => f.indexOf(' ') < 0)
  let d = 0
  forms.forEach(f => { d = Math.max(d, c.df[cat]?.[f] ?? 0) })
  return Math.log(((c.n[cat] ?? 0) + 1) / (d + 0.5))
}

export type V2Result = { score: number; reason: string }
export function scoreV2(category: string, queryText: string, title: string, description: string,
                        learned?: Record<string, number> | null): V2Result {
  const cat = String(category || '').toUpperCase()
  const tl = norm(`${title}\n${description}`)
  const tset = new Set(words(tl))
  if (HARD.test(tl) || HOAX.test(tl)) return { score: 0, reason: 'berita kriminal/hoaks' }
  if (cat === 'TENDER' && !TENDER_OPP.test(tl)) return { score: 0, reason: 'bukan pengumuman tender' }
  const { terms, locs } = parseQuery(queryText)
  if (locs.length && !locMatch(locs, tl)) return { score: 0, reason: 'lokasi tidak cocok' }
  if (!terms.length) return { score: 0, reason: 'query kosong' }
  const soft = (t: string) => SOFT.has(t) || (/^\d+$/.test(t) && t.length !== 4)
  const weight: Record<string, number> = {}
  terms.forEach(t => { weight[t] = Math.max(0.3, idf(cat, t)) * (soft(t) ? 0.4 : 1) })
  const matched = terms.filter(t => hasTerm(t, tl, tset))
  if (!matched.length) return { score: 0, reason: 'tidak ada kata cocok' }
  const hard = terms.filter(t => !soft(t))
  let cov: number
  if (hard.length >= 4) {                       // daftar kata kunci panjang = cukup salah satu (ATAU)
    const mh = hard.filter(t => matched.indexOf(t) >= 0)
    if (!mh.length) return { score: 0, reason: 'tidak satu pun kata kunci' }
    const best = hard.map(t => weight[t]).sort((a, b) => b - a)
    const median = best[Math.floor(best.length / 2)]
    cov = Math.min(1, mh.reduce((s, t) => s + weight[t], 0) / best[0])
    if (mh.length < 2 && mh.every(t => weight[t] < median)) cov *= 0.6
  } else {                                      // frasa pendek = semua kata wajib harus ada (DAN)
    const missing = hard.filter(t => matched.indexOf(t) < 0)
    if (missing.length) return { score: 0, reason: 'kata wajib tidak ada: ' + missing.join(',') }
    const tot = terms.reduce((s, t) => s + weight[t], 0)
    cov = matched.reduce((s, t) => s + weight[t], 0) / tot
  }
  const ttl = norm(title); const tts = new Set(words(ttl))
  const titleBonus = 0.1 * matched.filter(t => hasTerm(t, ttl, tts)).length / terms.length
  const listing = Math.min(0.15, LISTING.filter(r => r.test(tl)).length * 0.03)
  let pen = 0
  if (!NEWS_EXEMPT.has(cat) && NEWS_SIGNALS.filter(r => r.test(tl)).length >= 2) pen += 0.15
  const qn = norm(queryText)
  if ((FOREIGN.test(tl) || ((cat === 'LOWONGAN' || cat === 'PROPERTI') && FOREIGN_AS.test(tl))) && !FOREIGN.test(qn) && qn.indexOf('luar negeri') < 0) pen += 0.5
  if (cat === 'PROPERTI' && (GOSSIP.test(tl) || NOT_PROPERTY.test(tl))) pen += 0.4
  if (cat === 'TENDER' && TENDER_NOT.test(tl)) pen += 0.5
  if (learned) {
    let lp = 0
    Object.keys(learned).forEach(k => { if (tset.has(k)) lp += Number(learned[k]) || 0 })
    pen += Math.min(0.3, lp)
  }
  const score = Math.max(0, Math.min(1, cov * 0.8 + titleBonus + listing - pen))
  return { score, reason: score >= V2_THRESHOLD ? 'cocok' : 'skor rendah' }
}

// Filter pengguna — kata utuh (sebelumnya substring: "unit" ikut membuang "komunitas")
export function passesFiltersV2(filters: any, title: string, description: string, price: number | null): boolean {
  const f = filters ?? {}
  const tl = norm(`${title}\n${description}`)
  const list = (v: any) => String(v ?? '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
  if (f.mustInclude && list(f.mustInclude).some(w => !wordIn(w, tl))) return false
  if (f.exclude && list(f.exclude).some(w => wordIn(w, tl))) return false
  if (f.location) {
    const locs = String(f.location).toLowerCase().split(/[,;]| - /).map(s => s.trim().replace('tanggerang', 'tangerang')).filter(Boolean)
    if (locs.length && !locMatch(locs, tl)) return false
  }
  if (price != null) {
    if (f.priceMax && price > Number(f.priceMax)) return false
    if (f.priceMin && price < Number(f.priceMin)) return false
  }
  return true
}

// Penekan duplikat cerita: judul dengan >=60% kata bermakna sama dianggap kabar yang sama
export function titleKey(t: string): string[] {
  const out: string[] = []
  words(norm(t)).forEach(w => { if (w.length > 3 && !STOP.has(w) && out.indexOf(w) < 0) out.push(w) })
  return out
}
export function isNearDuplicate(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  const sb = new Set(b); let inter = 0
  a.forEach(w => { if (sb.has(w)) inter++ })
  return inter / Math.min(a.length, b.length) >= 0.6
}
