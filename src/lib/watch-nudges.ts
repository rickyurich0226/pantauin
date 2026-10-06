import { tokenize, extractLocationTokens } from './matching'

/**
 * Diagnosis kenapa sebuah watch belum pernah dapat notifikasi SENT, dan kasih
 * rekomendasi konkret. Dipakai oleh cron watch-health-check untuk kirim email
 * proaktif ke user — supaya mereka tahu sistem tetap jalan, bukan diem/rusak.
 */
export function diagnoseNoMatch(queryText: string): { reason: string; suggestion: string } {
  const words = tokenize(queryText)
  const uniqueWords = new Set(words)
  const hasDuplicates = words.length > uniqueWords.size
  const cities = extractLocationTokens(queryText)

  if (cities.size > 0) {
    return {
      reason: `Kata kunci kamu menyebut lokasi spesifik ("${Array.from(cities).join(', ')}"), dan sepertinya belum ada peluang baru yang cocok persis dengan lokasi itu.`,
      suggestion: 'Coba perluas area pencarian (misal ganti nama kota jadi nama provinsi), atau hapus filter lokasi supaya jangkauan lebih luas.'
    }
  }
  if (words.length >= 4 || hasDuplicates) {
    return {
      reason: 'Kata kunci kamu cukup panjang/detail, jadi peluang yang benar-benar cocok dengan semua kriteria itu masih jarang muncul.',
      suggestion: 'Coba sederhanakan jadi 2-3 kata inti saja (misal cuma nama produk/topik utamanya), supaya lebih banyak peluang relevan yang bisa ketangkep.'
    }
  }
  return {
    reason: 'Kategori atau topik ini sepertinya memang belum sering muncul di sumber yang kami pantau akhir-akhir ini.',
    suggestion: 'Tidak perlu diubah — sistem kami terus memindai otomatis 24 jam, begitu ada yang cocok kamu akan langsung dapat notifikasi.'
  }
}

export function buildNoMatchNudgeEmail(params: { userName: string; watchName: string; queryText: string; daysSinceCreated: number }) {
  const { userName, watchName, queryText, daysSinceCreated } = params
  const { reason, suggestion } = diagnoseNoMatch(queryText)
  const subject = `Pantauan "${watchName}" kamu masih kami pantau — ini kabarnya`
  const html = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">' +
    '<h2 style="color:#0D1B2A;margin-bottom:8px">Halo ' + (userName || 'Pengguna') + ',</h2>' +
    '<p style="color:#5A7090;line-height:1.7;margin-bottom:20px">Sistem kami tetap aktif memindai internet 24 jam untuk pantauan <strong>"' + watchName + '"</strong> kamu, tapi sudah ' + daysSinceCreated + ' hari belum ada peluang yang cocok.</p>' +
    '<div style="background:#FEF3C7;border-radius:12px;padding:16px 20px;margin-bottom:16px">' +
    '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#92400E">Kemungkinan penyebab:</p>' +
    '<p style="margin:0;font-size:14px;color:#78350F;line-height:1.6">' + reason + '</p></div>' +
    '<div style="background:#E8F0FB;border-radius:12px;padding:16px 20px;margin-bottom:24px">' +
    '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1560BD">Saran kami:</p>' +
    '<p style="margin:0;font-size:14px;color:#0D1B2A;line-height:1.6">' + suggestion + '</p></div>' +
    '<div style="text-align:center"><a href="' + (process.env.NEXTAUTH_URL || 'https://pantau.in') + '/dashboard/watches" ' +
    'style="background:#1560BD;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Edit Pantauan →</a></div>' +
    '<p style="text-align:center;font-size:12px;color:#9EB3C8;margin-top:24px">pantau.in — Monitor peluang otomatis</p></div>'
  return { subject, html }
}
