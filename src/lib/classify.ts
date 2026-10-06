// Klasifikasi kategori PER ARTIKEL. Sumber umum (media) bisa berisi lowongan, tender, properti, dll.
// Skor: kata khas kategori di judul x3, di deskripsi x1. Skor < 3 -> pakai kategori sumber (fallback).
const LEXICON: Record<string, RegExp> = {
  TENDER: /\b(tender|lelang|pengadaan|lpse|spse|e-katalog|hps|penyedia barang|kontrak pengadaan)\b/gi,
  LOWONGAN: /\b(lowongan|loker|rekrutmen|recruitment|hiring|vacancy|job ?fair|bursa kerja|magang|internship|penerimaan (cpns|pppk|pegawai|karyawan|calon)|seleksi (cpns|pppk)|dibutuhkan segera)\b/gi,
  PROPERTI: /\b(properti|perumahan|apartemen|kavling|kaveling|kpr|ruko|hunian|residence|residensial|cluster|klaster|townhouse|rumah (dijual|subsidi|murah)|dijual rumah|tanah dijual|dijual tanah)\b/gi,
  KENDARAAN: /\b(mobil bekas|motor bekas|mobil second|motor second|dijual mobil|dijual motor|harga mobil|harga motor|lelang (mobil|motor|kendaraan)|dealer)\b/gi,
  BEASISWA: /\b(beasiswa|scholarship|fellowship)\b/gi,
  BANTUAN: /\b(bansos|bantuan sosial|blt|pkh|hibah|kur|bantuan (modal|usaha|langsung|pemerintah))\b/gi,
  INVESTASI: /\b(saham|ihsg|reksa ?dana|obligasi|sukuk|sbn|dividen|ipo|kripto|crypto|bitcoin|emas antam|harga emas)\b/gi,
  KONSTRUKSI: /\b(kontraktor|konstruksi|proyek (pembangunan|infrastruktur|jalan|jembatan|gedung))\b/gi,
  BISNIS: /\b(peluang usaha|franchise|waralaba|kemitraan|umkm|reseller|dropship|modal usaha)\b/gi,
}
const PRIORITY = ['TENDER', 'LOWONGAN', 'PROPERTI', 'BEASISWA', 'BANTUAN', 'KENDARAAN', 'KONSTRUKSI', 'INVESTASI', 'BISNIS']

function hits(re: RegExp, s: string): number {
  const m = s.match(re)
  return m ? m.length : 0
}

export function classifyItem(title: string, description: string, fallback: string): string {
  const t = String(title || '')
  const d = String(description || '').slice(0, 2000)
  let best = ''
  let bestScore = 0
  for (const cat of PRIORITY) {
    const sc = hits(LEXICON[cat], t) * 3 + hits(LEXICON[cat], d)
    if (sc > bestScore || (sc === bestScore && sc > 0 && cat === fallback)) { best = cat; bestScore = sc }
  }
  // KONSTRUKSI & BARANG tidak ada di enum WatchCategory schema.prisma: KONSTRUKSI -> TENDER, lainnya -> fallback
  const VALID = ['TENDER', 'PROPERTI', 'KENDARAAN', 'BISNIS', 'INVESTASI', 'LOWONGAN', 'BEASISWA', 'BANTUAN']
  const out = bestScore >= 3 ? (best === 'KONSTRUKSI' ? 'TENDER' : best) : fallback
  return VALID.indexOf(out) >= 0 ? out : (VALID.indexOf(fallback) >= 0 ? fallback : 'BISNIS')
}
