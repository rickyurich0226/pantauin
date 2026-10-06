import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export const revalidate = 300

const VALID_CATEGORIES = ['TENDER','PROPERTI','KENDARAAN','BISNIS','INVESTASI','LOWONGAN','BEASISWA','BANTUAN']

// ============================================================
// FILTER KUALITAS — dipakai untuk halaman publik /peluang/*
// yang akan dibagikan luas. Dua lapis:
// 1. NEGATIVE FILTER: buang kata yang HAMPIR TIDAK PERNAH relevan
// 2. POSITIVE FILTER (kategori tertentu): wajib ada kata yang
//    beneran nyambung, karena kategori ini punya sumber RSS yang
//    luas/generik (Google News) sehingga sering kemasukan berita
//    umum yang gak ada hubungannya sama sekali.
// ============================================================

const UNIVERSAL_REJECT: string[] = [
  'korupsi', 'dugaan', 'diduga', 'sidang', 'pengadilan', 'kpk', 'polda', 'tersangka',
  'terdakwa', 'vonis', 'pidana', 'gugat', 'kasus', 'sengketa', 'ilegal', 'disita',
  'ditembak', 'tewas', 'kkb', 'pembunuhan', 'kecelakaan', 'meninggal dunia', 'tragedi',
  'bencana', 'kebakaran', 'banjir', 'gempa', 'ditangkap', 'ditahan', 'tilang', 'tipu', 'penipuan', 'motogp', 'sprint race',
  'zodiak', 'ramalan', 'horoskop',
  'siluman', 'akali aturan',
]

const COMMENTARY_REJECT: string[] = [
  'disinyalir', 'disorot', 'diminta', 'perlu dipahami', 'praperadilan',
  'putusan', 'opini', 'analisis', 'evaluasi', 'kritik', 'protes',
  'pelatihan', 'sorotan', 'menelanjangi', 'celah sistem', 'tata kelola',
  'wacana', 'usulan', 'rencana', 'dorong', 'minta pemerintah',
  'prioritaskan', 'dipersoalkan',
  // Berita ekonomi makro/politik dagang — bukan peluang bisnis untuk pembaca biasa
  'kecam', 'diprediksi', 'babak baru industri', 'mesin penggerak ekonomi',
  // Artikel tips/how-to — bukan pengumuman/listing
  'cara perawatan', 'cara merawat', 'tips merawat',
]

const CATEGORY_SPECIFIC_REJECT: Record<string, string[]> = {
  BEASISWA: ['cpns', 'pppk', 'sscasn', 'seleksi asn', 'pegawai negeri'],
}

// Kategori yang sumbernya luas/generik (Google News broad query) sehingga
// perlu bukti positif topik relevan, bukan cuma "tidak ada kata jelek".
const CATEGORY_POSITIVE_REQUIRED: Record<string, string[]> = {
  // Frasa spesifik (bukan kata umum tunggal) — 'bisnis'/'usaha' sendirian
  // terlalu generik dan cocok ke berita korporat besar (PR perusahaan,
  // forum CEO, dst) yang bukan peluang usaha untuk pembaca biasa.
  BISNIS: ['franchise', 'waralaba', 'peluang usaha', 'modal usaha', 'buka usaha',
    'jadi agen', 'jadi distributor', 'jadi mitra', 'kemitraan', 'reseller',
    'dropship', 'umkm naik kelas', 'bantuan umkm', 'usaha modal kecil',
    'bisnis modal kecil', 'ide usaha', 'ekspor umkm', 'agen resmi',
    'distributor resmi', 'mitra bisnis', 'gerai franchise'],
  INVESTASI: ['investasi', 'saham', 'obligasi', 'reksadana', 'emas', 'deposito',
    'sukuk', 'ipo', 'dividen', 'p2p lending', 'yield', 'return', 'bei', 'ihsg'],
  KENDARAAN: ['dijual', 'bekas', 'harga', 'unit', 'motor', 'mobil', 'kendaraan', 'truk', 'lelang', 'listrik'],
  PROPERTI: ['dijual', 'disewakan', 'rumah', 'tanah', 'kavling', 'ruko', 'apartemen', 'properti', 'kpr', 'sewa', 'strategis', 'luas', 'shm', 'lelang'],
}

function titleHasAny(title: string, signals: string[]): boolean {
  const t = title.toLowerCase()
  return signals.some(s => t.includes(s))
}

function isQualityListing(title: string, category: string): boolean {
  if (titleHasAny(title, UNIVERSAL_REJECT)) return false
  if (titleHasAny(title, COMMENTARY_REJECT)) return false
  const specific = CATEGORY_SPECIFIC_REJECT[category]
  if (specific && titleHasAny(title, specific)) return false
  const required = CATEGORY_POSITIVE_REQUIRED[category]
  if (required && !titleHasAny(title, required)) return false
  return true
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')?.toUpperCase()
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })
  }
  try {
    const raw = await prisma.listingItem.findMany({
      where: { category: category as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { title: true, url: true, publishedAt: true, createdAt: true },
    })
    const items = raw.filter(it => isQualityListing(it.title, category)).slice(0, 20)
    return NextResponse.json({ category, items, count: items.length })
  } catch {
    return NextResponse.json({ category, items: [], count: 0 })
  }
}
