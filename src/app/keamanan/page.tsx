'use client'
import { useContact } from '@/lib/useContact'
export default function KeamananPage() {
  const { email } = useContact()
  return (
    <main style={{maxWidth:'800px',margin:'0 auto',padding:'clamp(32px,5vw,60px) clamp(16px,3vw,24px)',fontFamily:'Inter, sans-serif'}}>
      <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none',display:'block',marginBottom:'32px'}}>← Beranda</a>
      <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#E1F5EE',borderRadius:'100px',padding:'6px 16px',marginBottom:'20px'}}>
        <span style={{fontSize:'12px',fontWeight:600,color:'#0F6E56'}}>🔒 Keamanan & Privasi</span>
      </div>
      <h1 style={{fontSize:'clamp(28px,5vw,42px)',fontWeight:800,color:'#0D1B2A',marginBottom:'16px',lineHeight:1.2}}>Data Kamu Aman di Pantau.in</h1>
      <p style={{fontSize:'18px',color:'#5A7090',marginBottom:'48px',lineHeight:1.7}}>Kepercayaan adalah fondasi utama kami. Setiap keputusan teknis dan produk dibuat dengan mempertimbangkan keamanan dan privasi pengguna.</p>
      <div style={{display:'grid',gap:'20px',marginBottom:'48px'}}>
        {[
          {icon:'🔐',t:'Enkripsi AES-256',d:'Semua data sensitif pengguna — termasuk nomor telepon dan nomor WhatsApp — dienkripsi menggunakan AES-256-GCM, standar enkripsi yang digunakan oleh perbankan dan lembaga keuangan global.'},
          {icon:'🚫',t:'Data Tidak Dijual',d:'Pantau.in tidak pernah dan tidak akan menjual data pengguna ke pihak ketiga manapun. Data kamu digunakan semata-mata untuk menjalankan layanan notifikasi yang kamu minta.'},
          {icon:'🇮🇩',t:'Patuh UU PDP Indonesia',d:'Pantau.in beroperasi sesuai dengan Undang-Undang No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP). Kamu berhak mengakses, mengkoreksi, dan menghapus data pribadimu kapan saja.'},
          {icon:'🗑️',t:'Hapus Akun & Data',d:'Kamu bisa menghapus akun dan semua data yang terkait kapan saja dari halaman Settings → Akun. Penghapusan bersifat permanen dan tidak dapat dibatalkan.'},
          {icon:'🛡️',t:'Rate Limiting & Proteksi',d:'Semua endpoint API dilindungi dengan rate limiting, validasi input ketat, dan audit logging untuk mendeteksi aktivitas mencurigakan secara real-time.'},
          {icon:'🔑',t:'Two-Factor Authentication',d:'Aktifkan 2FA di Settings → Keamanan untuk lapisan perlindungan tambahan pada akun kamu menggunakan Google Authenticator atau aplikasi TOTP lainnya.'},
        ].map(item => (
          <div key={item.t} style={{display:'flex',gap:'16px',padding:'20px',background:'#F8FAFC',borderRadius:'12px',border:'1px solid #E8EEF5'}}>
            <div style={{fontSize:'28px',flexShrink:0}}>{item.icon}</div>
            <div>
              <h2 style={{fontWeight:700,fontSize:'16px',color:'#0D1B2A',marginBottom:'8px'}}>{item.t}</h2>
              <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.7,margin:0}}>{item.d}</p>
            </div>
          </div>
        ))}
      </div>
      <section style={{background:'#E1F5EE',borderRadius:'16px',padding:'24px',marginBottom:'32px'}}>
        <h2 style={{fontSize:'18px',fontWeight:700,color:'#0F6E56',marginBottom:'12px'}}>Data apa yang kami kumpulkan?</h2>
        <ul style={{paddingLeft:'20px',color:'#5A7090',lineHeight:2,fontSize:'14px',margin:0}}>
          <li>Nama dan alamat email (untuk akun dan notifikasi)</li>
          <li>Nomor WhatsApp/Telegram (opsional, hanya jika kamu aktifkan)</li>
          <li>Kata kunci pantauan yang kamu buat</li>
          <li>Log aktivitas untuk keamanan (IP address, waktu login)</li>
          <li>Data transaksi pembayaran (diproses oleh Midtrans, bukan kami)</li>
        </ul>
      </section>
      <p style={{fontSize:'14px',color:'#9EB3C8',textAlign:'center'}}>Ada pertanyaan soal privasi? Hubungi kami di <a href={`mailto:${email}`} style={{color:'#1560BD'}}>{email}</a> atau baca <a href="/kebijakan-privasi" style={{color:'#1560BD'}}>Kebijakan Privasi</a> lengkap kami.</p>
    </main>
  )
}

