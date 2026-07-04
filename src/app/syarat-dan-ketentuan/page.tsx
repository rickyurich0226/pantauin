import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan Pantau.in — Ketentuan Penggunaan Layanan',
  description: 'Baca syarat dan ketentuan penggunaan layanan Pantau.in sebelum mendaftar. Mencakup hak pengguna, kewajiban, pembatasan layanan, dan kebijakan langganan.',
  keywords: 'syarat ketentuan pantau.in, terms of service, aturan penggunaan',
  openGraph: {
    title: 'Syarat & Ketentuan Pantau.in — Ketentuan Penggunaan Layanan',
    description: 'Baca syarat dan ketentuan penggunaan layanan Pantau.in sebelum mendaftar. Mencakup hak pengguna, kewajiban, pembatasan layanan, dan kebijakan langganan.',
    url: 'https://pantau.in/syarat-dan-ketentuan',
    siteName: 'Pantau.in',
    type: 'website',
  },
  alternates: {
    canonical: 'https://pantau.in/syarat-dan-ketentuan',
  },
}

export default function SyaratKetentuan() {
  const sections = [
    ['1. Penerimaan Syarat','Dengan menggunakan Pantau.in, kamu menyetujui syarat dan ketentuan ini sepenuhnya.'],
    ['2. Deskripsi Layanan','Pantau.in adalah platform agregator real-time yang menggunakan AI untuk menemukan peluang bisnis, tender, properti, kendaraan dari berbagai sumber internet.'],
    ['3. Akun Pengguna','Kamu bertanggung jawab menjaga kerahasiaan akun dan password. Segera hubungi kami jika ada akses tidak sah.'],
    ['4. Penggunaan yang Diizinkan','Layanan hanya untuk tujuan sah. Dilarang menggunakan untuk aktivitas ilegal, menyebarkan konten berbahaya, atau melakukan scraping berlebihan.'],
    ['5. Pembayaran & Refund','Semua pembayaran via Midtrans (aman, PCI DSS). Refund dapat diajukan dalam 7 hari jika layanan bermasalah.'],
    ['6. Privasi Data','Data dikumpulkan minimal untuk layanan. Tidak dijual ke pihak ketiga. Lihat Kebijakan Privasi untuk detail.'],
    ['7. Batasan Tanggung Jawab','Pantau.in tidak menjamin keakuratan informasi dari sumber pihak ketiga. Verifikasi sebelum mengambil keputusan bisnis.'],
    ['8. Perubahan Layanan','Kami berhak mengubah layanan dengan pemberitahuan sebelumnya. Perubahan harga dengan notice 30 hari.'],
    ['9. Hukum yang Berlaku','Diatur hukum Republik Indonesia. Sengketa diselesaikan melalui musyawarah atau Pengadilan Negeri Jakarta.'],
    ['10. Kontak','Pertanyaan: pantau.inofficial@gmail.com | WhatsApp: @pantauin'],
  ]
  return (
    <div style={{minHeight:'100vh',background:'#F0F4F9',fontFamily:'Inter,sans-serif'}}>
      <nav style={{background:'white',borderBottom:'1px solid #DDE5EF',padding:'0 16px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{display:"flex",alignItems:"center",gap:"8px",textDecoration:"none"}}><img src="/logo.png" alt="pantau.in" style={{height:"32px",objectFit:"contain"}}/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'20px',fontWeight:800}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></a>
        <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none'}}>← Kembali ke Beranda</a>
      </nav>
      <div style={{maxWidth:'760px',margin:'0 auto',padding:'clamp(24px,5vw,56px) clamp(16px,3vw,24px)'}}>
        <div style={{background:'white',borderRadius:'16px',padding:'clamp(20px,4vw,48px)',border:'1px solid #DDE5EF'}}>
          <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'32px',fontWeight:800,marginBottom:'8px'}}>Syarat & Ketentuan</h1>
          <p style={{color:'#9EB3C8',fontSize:'14px',marginBottom:'40px'}}>Terakhir diperbarui: 1 Juni 2025</p>
          {sections.map(([title, content]) => (
            <div key={title} style={{marginBottom:'28px'}}>
              <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'17px',fontWeight:700,color:'#0D1B2A',marginBottom:'8px'}}>{title}</h2>
              <p style={{fontSize:'15px',color:'#5A7090',lineHeight:1.8,margin:0}}>{content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}