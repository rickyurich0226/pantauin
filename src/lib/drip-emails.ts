export interface DripEmailParams {
  name: string
  email: string
  hasWatch: boolean
  daysSinceRegister: number
}
export interface DripEmailResult {
  subject: string
  html: string
}

const B = "https://pantau.in"

function wrap(pre: string, body: string): string {
  return "<!DOCTYPE html><html><head><meta charset=UTF-8/><meta name=viewport content=width=device-width,initial-scale=1/></head>" +
  "<body style=margin:0;padding:0;background:#F0F4F9;font-family:Inter,-apple-system,sans-serif;>" +
  "<div style=display:none;max-height:0;overflow:hidden;>" + pre + "</div>" +
  "<table width=100% cellpadding=0 cellspacing=0 style=background:#F0F4F9;padding:32px 16px;><tr><td align=center>" +
  "<table width=100% style=max-width:560px;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);>" +
  "<tr><td style=background:linear-gradient(135deg,#0D1B2A,#1560BD);padding:28px 32px;>" +
  "<a href=" + B + " style=text-decoration:none;font-size:24px;font-weight:800;color:white;>pantau<span style=color:#00C2FF;>.in</span></a></td></tr>" +
  "<tr><td style=padding:32px;>" + body + "</td></tr>" +
  "<tr><td style=background:#F8FAFC;padding:20px 32px;border-top:1px solid #DDE5EF;>" +
  "<p style=margin:0;font-size:12px;color:#9EB3C8;text-align:center;>" +
  "&copy; 2026 Pantau.in &middot; <a href=" + B + "/pusat-bantuan style=color:#9EB3C8;>Pusat Bantuan</a> &middot; <a href=" + B + "/kebijakan-privasi style=color:#9EB3C8;>Kebijakan Privasi</a></p>" +
  "<p style=margin:8px 0 0;font-size:11px;color:#C5D3E0;text-align:center;>Kamu menerima email ini karena terdaftar di pantau.in</p>" +
  "</td></tr></table></td></tr></table></body></html>"
}

function btn(text: string, url: string): string {
  return "<div style=text-align:center;margin:24px 0;><a href=" + url + " style=display:inline-block;background:linear-gradient(135deg,#1560BD,#0F6E56);color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;>" + text + "</a></div>"
}

export function getDripEmail(key: string, p: DripEmailParams): DripEmailResult {
  const first = p.name.split(" ")[0]

  if (key === "DRIP_EMAIL_DAY1") return {
    subject: first + ", selamat datang di Pantau.in! Ini cara mulainya",
    html: wrap("Pantau peluang tender, properti, dan bisnis secara otomatis",
      "<h1 style=font-size:24px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>Hei " + first + ", selamat bergabung!</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 20px;>Kamu baru saja gabung ke platform yang memantau <strong>ribuan peluang</strong> secara otomatis 24/7.</p>" +
      "<div style=background:#F0F4F9;border-radius:12px;padding:20px;margin:0 0 24px;>" +
      "<p style=font-weight:700;color:#0D1B2A;margin:0 0 14px;>3 langkah untuk mulai:</p>" +
      "<p style=margin:0 0 10px;color:#5A7090;>1. Klik <strong>Tambah Pantauan</strong> di dashboard</p>" +
      "<p style=margin:0 0 10px;color:#5A7090;>2. Tulis peluang yang kamu cari, contoh: <em>tender konstruksi Jawa Barat di atas 500 juta</em></p>" +
      "<p style=margin:0;color:#5A7090;>3. Sistem langsung pantau dan kirim notifikasi ke email kamu</p></div>" +
      btn("Buat Pantauan Pertama &rarr;", B + "/dashboard/watches") +
      "<p style=color:#9EB3C8;font-size:13px;text-align:center;>Ada pertanyaan? Chat kami di <a href=https://wa.me/6287890144122 style=color:#1560BD;>WhatsApp</a></p>"
    )
  }

  if (key === "DRIP_EMAIL_DAY3" && !p.hasWatch) return {
    subject: first + ", kamu belum setup pantauan pertama",
    html: wrap("Jangan sampai ketinggalan peluang yang sudah menunggu kamu",
      "<h1 style=font-size:22px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>Sistem sudah siap, tinggal kamu, " + first + "!</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 16px;>Sudah 3 hari sejak kamu daftar, tapi pantauan pertamamu belum dibuat. Selama itu, <strong>ribuan peluang</strong> sudah lewat tanpa kamu ketahui.</p>" +
      "<div style=background:#FEF3C7;border-left:4px solid #D97706;border-radius:8px;padding:16px;margin:0 0 20px;>" +
      "<p style=margin:0;color:#92400E;font-size:14px;line-height:1.6;>Tender pengadaan punya deadline <strong>7-14 hari</strong> sejak pengumuman. Tanpa monitoring otomatis, kamu bisa ketinggalan setiap hari.</p></div>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 20px;>Setup hanya butuh <strong>2 menit</strong>.</p>" +
      btn("Setup Pantauan Sekarang &rarr;", B + "/dashboard/watches")
    )
  }

  if (key === "DRIP_EMAIL_DAY3" && p.hasWatch) return {
    subject: "Ini yang terjadi di balik layar untuk kamu, " + first,
    html: wrap("Ratusan sumber dipantau setiap 15 menit untuk kamu",
      "<h1 style=font-size:22px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>Ini yang terjadi setiap 15 menit untuk kamu</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 16px;>Sejak kamu setup pantauan, sistem kami bekerja tanpa henti:</p>" +
      "<div style=background:#F8FAFC;border-radius:10px;padding:14px;margin:0 0 10px;><p style=font-weight:700;color:#0D1B2A;margin:0 0 4px;>Fetch 400+ sumber</p><p style=color:#5A7090;font-size:13px;margin:0;>Portal LPSE, marketplace properti, job board, dan ratusan sumber lainnya</p></div>" +
      "<div style=background:#F8FAFC;border-radius:10px;padding:14px;margin:0 0 10px;><p style=font-weight:700;color:#0D1B2A;margin:0 0 4px;>Analisis AI berbahasa Indonesia</p><p style=color:#5A7090;font-size:13px;margin:0;>Setiap item dicocokkan dengan keyword pantauan kamu</p></div>" +
      "<div style=background:#E8F0FB;border-radius:10px;padding:14px;margin:0 0 20px;><p style=color:#1560BD;font-size:14px;margin:0;>Upgrade ke Pro untuk notifikasi <strong>WhatsApp dan Telegram</strong></p></div>" +
      btn("Lihat Dashboard &rarr;", B + "/dashboard")
    )
  }

  if (key === "DRIP_EMAIL_DAY7") return {
    subject: first + ", user Pro rata-rata dapat 3-5 peluang per minggu",
    html: wrap("Lihat perbedaan akun Free vs Pro",
      "<h1 style=font-size:22px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>Sudah seminggu, saatnya naik level, " + first + "!</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 16px;>User Pro kami mendapat jauh lebih banyak dari akun Free:</p>" +
      "<table width=100% style=border-collapse:collapse;margin:0 0 20px;font-size:13px;>" +
      "<tr style=background:#0D1B2A;color:white;><th style=padding:10px 12px;text-align:left;>Fitur</th><th style=padding:10px;text-align:center;>Free</th><th style=padding:10px;text-align:center;background:#1560BD;>Pro</th></tr>" +
      "<tr style=background:#F8FAFC;><td style=padding:9px 12px;>Pantauan</td><td style=text-align:center;color:#5A7090;>3</td><td style=text-align:center;color:#0F6E56;font-weight:700;background:#F0F7FF;>Unlimited</td></tr>" +
      "<tr><td style=padding:9px 12px;>WhatsApp</td><td style=text-align:center;color:#EF4444;>Tidak</td><td style=text-align:center;color:#0F6E56;font-weight:700;background:#F0F7FF;>Ya</td></tr>" +
      "<tr style=background:#F8FAFC;><td style=padding:9px 12px;>Telegram</td><td style=text-align:center;color:#EF4444;>Tidak</td><td style=text-align:center;color:#0F6E56;font-weight:700;background:#F0F7FF;>Ya</td></tr>" +
      "<tr><td style=padding:9px 12px;>Update</td><td style=text-align:center;color:#5A7090;>Harian</td><td style=text-align:center;color:#0F6E56;font-weight:700;background:#F0F7FF;>Real-time</td></tr>" +
      "</table>" +
      "<div style=background:linear-gradient(135deg,#0D1B2A,#1560BD);border-radius:14px;padding:24px;text-align:center;>" +
      "<p style=color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;>Harga spesial</p>" +
      "<p style=color:white;font-size:32px;font-weight:800;margin:0 0 4px;>Rp 49.000<span style=font-size:15px;font-weight:400;>/bulan</span></p>" +
      "<p style=color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 16px;>Kurang dari Rp 1.700/hari</p>" +
      "<a href=" + B + "/dashboard/upgrade style=display:inline-block;background:white;color:#1560BD;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;>Upgrade ke Pro Sekarang &rarr;</a></div>" +
      "<p style=color:#9EB3C8;font-size:12px;text-align:center;margin:12px 0 0;>Garansi uang kembali 7 hari jika tidak puas</p>"
    )
  }

  if (key === "DRIP_EMAIL_DAY14") return {
    subject: first + ", diskon 20% khusus untuk kamu, berakhir 48 jam",
    html: wrap("Penawaran eksklusif khusus user lama",
      "<div style=background:#FEF2F2;border:2px solid #FCA5A5;border-radius:10px;padding:14px;text-align:center;margin:0 0 20px;><p style=color:#DC2626;font-weight:700;margin:0;>Penawaran berakhir dalam 48 jam</p></div>" +
      "<h1 style=font-size:22px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>Kami ingin kamu jadi Pro, " + first + "</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 20px;>Sudah 2 minggu kamu pakai Pantau.in versi Free. Sekarang saatnya dapatkan semua fitur Pro dengan harga spesial.</p>" +
      "<div style=background:linear-gradient(135deg,#0F6E56,#1560BD);border-radius:14px;padding:24px;text-align:center;>" +
      "<p style=color:rgba(255,255,255,0.7);margin:0 0 4px;font-size:13px;>DISKON EKSKLUSIF 20%</p>" +
      "<p style=color:rgba(255,255,255,0.5);font-size:16px;text-decoration:line-through;margin:0;>Rp 49.000/bulan</p>" +
      "<p style=color:white;font-size:36px;font-weight:800;margin:4px 0;>Rp 39.200<span style=font-size:15px;font-weight:400;>/bulan</span></p>" +
      "<p style=color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 16px;>Hemat Rp 117.600 per tahun</p>" +
      "<a href=" + B + "/dashboard/upgrade style=display:inline-block;background:white;color:#0F6E56;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;>Klaim Diskon 20% Sekarang &rarr;</a></div>" +
      "<p style=color:#5A7090;font-size:13px;text-align:center;margin:12px 0 0;>Diskon otomatis diterapkan. Berlaku 48 jam.</p>"
    )
  }

  if (key === "DRIP_EMAIL_DAY30") return {
    subject: first + ", ini email terakhir kami",
    html: wrap("Kami tidak akan spam kamu lagi setelah ini",
      "<h1 style=font-size:22px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>Jujur, " + first + " - ini email terakhir kami</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 16px;>Sudah sebulan kamu pakai Pantau.in. Kami tidak mau terus ganggu kamu dengan email promosi.</p>" +
      "<div style=background:#F8FAFC;border-left:4px solid #1560BD;border-radius:8px;padding:20px;margin:0 0 20px;>" +
      "<p style=font-weight:700;color:#0D1B2A;font-size:16px;margin:0 0 8px;>Apakah ada peluang yang selama ini kamu lewatkan karena tidak tahu?</p>" +
      "<p style=color:#5A7090;font-size:14px;margin:0;line-height:1.6;>Tender yang sudah tutup. Properti murah yang sudah terjual. Lowongan yang sudah expired. Pantau.in hadir agar itu tidak terjadi lagi.</p></div>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 20px;>Kalau kamu tetap di plan Free - tidak apa-apa, kami tetap di sini untuk kamu. Tapi kalau mau berhenti ketinggalan peluang, pintu Pro selalu terbuka.</p>" +
      btn("Upgrade ke Pro - Rp 49.000/bln &rarr;", B + "/dashboard/upgrade") +
      "<p style=color:#9EB3C8;font-size:13px;text-align:center;margin:0;>Terima kasih sudah mempercayai Pantau.in, " + first + ". - Tim Pantau.in</p>"
    )
  }

  if (key === "DRIP_EMAIL_DAY45" && !p.hasWatch) return {
    subject: first + ", akun kamu masih kosong - butuh bantuan?",
    html: wrap("Kami notice kamu belum sempat mulai, ada yang bisa dibantu?",
      "<h1 style=font-size:22px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>Hei " + first + ", butuh bantuan setup?</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 16px;>Ini bukan email promosi biasa - kami notice akun kamu masih belum ada pantauan aktif sejak daftar. Mungkin bingung cara mulainya, atau ada kendala lain?</p>" +
      "<div style=background:#F0F4F9;border-radius:12px;padding:20px;margin:0 0 20px;>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0;>Balas email ini atau chat kami di WhatsApp, kami bantu setup pantauan pertama kamu langsung - gratis, tanpa syarat.</p></div>" +
      btn("Buat Pantauan Sekarang &rarr;", B + "/dashboard/watches") +
      "<p style=color:#9EB3C8;font-size:13px;text-align:center;>Atau chat kami di <a href=https://wa.me/6287890144122 style=color:#1560BD;>WhatsApp</a> untuk bantuan langsung</p>"
    )
  }

  if (key === "DRIP_EMAIL_DAY60" && !p.hasWatch) return {
    subject: first + ", email terakhir kami - akun kamu masih belum aktif",
    html: wrap("Ini benar-benar email terakhir soal ini",
      "<h1 style=font-size:22px;font-weight:800;color:#0D1B2A;margin:0 0 12px;>" + first + ", ini benar-benar terakhir</h1>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 16px;>Dua bulan sejak daftar, akun kamu masih belum punya pantauan aktif. Kami tidak akan email soal ini lagi setelah ini.</p>" +
      "<p style=color:#5A7090;line-height:1.7;margin:0 0 20px;>Kalau memang belum butuh sekarang, tidak masalah - akun kamu tetap aman dan bisa dipakai kapan saja kamu siap.</p>" +
      btn("Mulai Sekarang &rarr;", B + "/dashboard/watches") +
      "<p style=color:#9EB3C8;font-size:13px;text-align:center;margin:0;>Terima kasih, " + first + ". - Tim Pantau.in</p>"
    )
  }

  return { subject: "", html: "" }
}
