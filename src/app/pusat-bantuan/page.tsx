export const metadata = {
  title: 'Pusat Bantuan',
  description: 'Panduan lengkap menggunakan pantau.in — setup pantauan, notifikasi WhatsApp, Telegram, dan akun.',
  alternates: { canonical: 'https://pantau.in/pusat-bantuan' },
}

const GUIDES = [
  {
    i:'🚀', t:'Memulai dengan Pantau.in',
    items:[
      {q:'Cara daftar akun', a:'Klik "Daftar Gratis" di halaman utama. Isi nama, email, dan password. Kamu langsung masuk ke dashboard setelah daftar.'},
      {q:'Cara membuat pantauan pertama', a:'Di dashboard, klik "+ Tambah Pantau.in". Pilih kategori, tulis deskripsi peluang yang dicari dalam bahasa natural, lalu klik "Buat Pantauan". Sistem akan mulai memantau dalam 5 menit.'},
      {q:'Berapa lama dapat notifikasi pertama?', a:'Sistem memantau setiap 5 menit. Notifikasi pertama biasanya datang dalam 5-10 menit jika ada peluang yang cocok.'},
      {q:'Berapa batas plan Gratis?', a:'Plan Gratis: maksimal 3 pantauan, notifikasi via Email saja, digest harian. Upgrade ke Pro untuk unlimited pantauan, real-time, dan WA/Telegram.'},
    ]
  },
  {
    i:'💬', t:'Setup Notifikasi WhatsApp',
    items:[
      {q:'Cara aktifkan notifikasi WhatsApp', a:'Masuk ke Dashboard → Pengaturan → pilih channel "WhatsApp" → masukkan nomor WA aktif kamu (format: 08xx atau 62xx) → klik Simpan. Fitur ini tersedia untuk plan Pro ke atas.'},
      {q:'Format nomor WhatsApp yang benar', a:'Masukkan nomor dengan awalan 08 atau 62. Contoh: 081234567890 atau 6281234567890. Jangan gunakan tanda + atau spasi.'},
      {q:'Notifikasi WA tidak masuk', a:'Pastikan: (1) Nomor WA benar dan aktif, (2) Channel WhatsApp sudah dicentang di Pengaturan, (3) Notifikasi tidak di-nonaktifkan. Jika masih bermasalah, hubungi support kami.'},
      {q:'Apakah WA Business API aman?', a:'Ya. Kami menggunakan WhatsApp Business API resmi dari Meta. Nomor kamu hanya digunakan untuk mengirim notifikasi pantauan, tidak untuk keperluan lain.'},
    ]
  },
  {
    i:'✈️', t:'Setup Notifikasi Telegram',
    items:[
      {q:'Cara aktifkan notifikasi Telegram', a:'1. Buka Telegram, cari @userinfobot dan kirim /start untuk dapat ID kamu. 2. Di Dashboard → Pengaturan → pilih channel "Telegram" → masukkan Telegram ID (angka) → klik Simpan.'},
      {q:'Cara mendapatkan Telegram ID', a:'Buka Telegram → cari @userinfobot → kirim /start → bot akan balas dengan ID berupa angka (contoh: 123456789). Salin angka tersebut ke kolom Telegram ID di Pengaturan.'},
      {q:'Notifikasi Telegram tidak masuk', a:'Pastikan Telegram ID yang dimasukkan benar (hanya angka). Coba kirim /start ke @userinfobot lagi untuk konfirmasi ID. Jika masih bermasalah, hubungi support.'},
    ]
  },
  {
    i:'💳', t:'Pembayaran & Langganan',
    items:[
      {q:'Metode pembayaran yang tersedia', a:'Transfer bank (BCA, Mandiri, BNI, BRI), QRIS, GoPay, OVO, ShopeePay, dan Kartu Kredit/Debit via Midtrans.'},
      {q:'Cara upgrade ke Pro', a:'Dashboard → klik "Upgrade Plan" di sidebar → pilih plan Pro atau Business → pilih billing bulanan/tahunan → klik tombol upgrade → selesaikan pembayaran via Midtrans.'},
      {q:'Apakah ada refund?', a:'Kami menyediakan refund dalam 3 hari pertama jika plan belum digunakan secara signifikan. Hubungi pantau.inofficial@gmail.com dengan subject "Refund Request" beserta order ID kamu.'},
      {q:'Cara batalkan langganan', a:'Dashboard → Pengaturan → Batalkan Langganan. Plan akan kembali ke Free setelah periode billing berjalan berakhir. Data pantauan tetap tersimpan.'},
    ]
  },
  {
    i:'🔒', t:'Akun & Keamanan',
    items:[
      {q:'Cara ganti password', a:'Dashboard → Pengaturan → tab Keamanan → masukkan password lama dan password baru → klik Simpan.'},
      {q:'Lupa password', a:'Di halaman login, klik "Lupa Password" → masukkan email → cek inbox untuk link reset → klik link dan buat password baru. Link berlaku 1 jam.'},
      {q:'Cara aktifkan 2FA', a:'Dashboard → Pengaturan → tab Keamanan → aktifkan Two-Factor Authentication → scan QR code dengan Google Authenticator atau Authy.'},
      {q:'Hapus akun', a:'Hubungi pantau.inofficial@gmail.com dengan subject "Hapus Akun" dari email yang terdaftar. Proses penghapusan 1-3 hari kerja sesuai UU PDP.'},
    ]
  },
]

export default function PusatBantuan() {
  return (
    <div style={{minHeight:'100vh',background:'#F0F4F9',fontFamily:'Inter,sans-serif'}}>
      <nav style={{background:'white',borderBottom:'1px solid #DDE5EF',padding:'0 16px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{display:"flex",alignItems:"center",gap:"8px",textDecoration:"none"}}><img src="/logo.png" alt="pantau.in" style={{height:"32px",objectFit:"contain"}}/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'20px',fontWeight:800}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></a>
        <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none'}}>← Beranda</a>
      </nav>

      <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',padding:'48px 24px',textAlign:'center'}}>
        <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'32px',fontWeight:800,color:'white',marginBottom:'8px'}}>Pusat Bantuan 🙋</h1>
        <p style={{color:'rgba(255,255,255,0.75)',fontSize:'15px',marginBottom:'24px'}}>Temukan jawaban atas pertanyaan kamu</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <a href="mailto:pantau.inofficial@gmail.com" style={{background:'white',color:'#1560BD',fontWeight:700,padding:'10px 22px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>📧 Email Support</a>
          <a href="https://wa.me/6287890144122" target="_blank" rel="noopener noreferrer" style={{background:'#25D366',color:'white',fontWeight:700,padding:'10px 22px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>💬 Chat WhatsApp</a>
        </div>
      </div>

      <div style={{maxWidth:'900px',margin:'0 auto',padding:'40px 24px'}}>
        {GUIDES.map(section => (
          <div key={section.t} style={{marginBottom:'32px'}}>
            <h2 style={{fontSize:'18px',fontWeight:800,color:'#0D1B2A',marginBottom:'16px',display:'flex',alignItems:'center',gap:'10px'}}>
              <span>{section.i}</span>{section.t}
            </h2>
            <div style={{display:'grid',gap:'10px'}}>
              {section.items.map(item => (
                <div key={item.q} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'20px 24px'}}>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#0D1B2A',marginBottom:'8px'}}>{item.q}</p>
                  <p style={{fontSize:'13px',color:'#5A7090',lineHeight:1.7,margin:0}}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Contact section */}
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'32px',textAlign:'center',marginTop:'16px'}}>
          <h3 style={{fontWeight:800,fontSize:'18px',marginBottom:'8px'}}>Masih butuh bantuan?</h3>
          <p style={{color:'#5A7090',marginBottom:'24px',fontSize:'14px'}}>Tim support kami aktif Senin–Jumat, 09.00–18.00 WIB. Response time rata-rata 2 jam.</p>
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <a href="mailto:pantau.inofficial@gmail.com" style={{background:'#1560BD',color:'white',fontWeight:700,padding:'12px 24px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>
              📧 pantau.inofficial@gmail.com
            </a>
            <a href="https://wa.me/6287890144122" target="_blank" rel="noopener noreferrer"
              style={{background:'#E1F5EE',color:'#0F6E56',fontWeight:700,padding:'12px 24px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>
              💬 WhatsApp Support
            </a>
          </div>
          <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'16px'}}>
            Untuk laporan bug atau feedback produk: <a href="mailto:pantau.inofficial@gmail.com" style={{color:'#1560BD'}}>pantau.inofficial@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
