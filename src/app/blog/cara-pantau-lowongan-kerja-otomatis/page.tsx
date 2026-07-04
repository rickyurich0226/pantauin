import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cara Pantau Lowongan Kerja Otomatis dan Dapat Notifikasi ke WhatsApp',
  description: 'Capek refresh JobStreet tiap hari? Pelajari cara memantau lowongan kerja sesuai keahlian secara otomatis dan terima notifikasi langsung ke WhatsApp atau Telegram.',
  openGraph: {
    title: 'Cara Pantau Lowongan Kerja Otomatis dan Dapat Notifikasi ke WhatsApp',
    description: 'Capek refresh JobStreet tiap hari? Pelajari cara memantau lowongan kerja sesuai keahlian secara otomatis dan terima notifikasi langsung ke WhatsApp atau Telegram.',
    url: 'https://pantau.in/blog/cara-pantau-lowongan-kerja-otomatis',
    siteName: 'Pantau.in',
    type: 'article',
    publishedTime: '2025-06-15',
  },
  alternates: {
    canonical: 'https://pantau.in/blog/cara-pantau-lowongan-kerja-otomatis',
  },
}

export default function BlogPost() {
  return (
    <div style={{maxWidth:'720px',margin:'0 auto',padding:'40px 20px'}}>
      <div style={{marginBottom:'32px'}}>
        <a href="/blog" style={{fontSize:'13px',color:'#1560BD',textDecoration:'none',fontWeight:600}}>Kembali ke Blog</a>
      </div>
      <div style={{marginBottom:'24px'}}>
        <span style={{fontSize:'12px',color:'#9EB3C8'}}>2025-06-15</span>
      </div>
      <h1 style={{fontSize:'clamp(22px,4vw,32px)',fontWeight:800,color:'#0D1B2A',lineHeight:1.3,marginBottom:'16px'}}>
        Cara Pantau Lowongan Kerja Otomatis dan Dapat Notifikasi ke WhatsApp
      </h1>
      <p style={{fontSize:'16px',color:'#5A7090',lineHeight:1.7,marginBottom:'32px',borderBottom:'1px solid #E8EEF5',paddingBottom:'24px'}}>
        Capek refresh JobStreet tiap hari? Pelajari cara memantau lowongan kerja sesuai keahlian secara otomatis dan terima notifikasi langsung ke WhatsApp atau Telegram.
      </p>
      <div style={{fontSize:'15px',color:'#374151',lineHeight:1.8}}>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Masalah Pencari Kerja Zaman Sekarang</h2>
        <p>Rata-rata pencari kerja menghabiskan 2-3 jam sehari hanya untuk membuka JobStreet, LinkedIn, Glints, dan portal lowongan lainnya. Padahal lowongan yang relevan bisa muncul kapan saja dan kandidat pertama yang melamar sering punya keunggulan besar.</p>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Solusi: Pantauan Otomatis 24 Jam</h2>
        <p>Pantau.in memindai puluhan sumber lowongan kerja setiap 5 menit mulai dari LinkedIn, JobStreet, Glints, Kalibrr, hingga situs karir perusahaan langsung. Begitu ada lowongan baru yang cocok dengan keyword kamu, notifikasi langsung dikirim ke WhatsApp.</p>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Cara Memulai</h2>
        <p>Daftar gratis di pantau.in, pilih profil Pencari Kerja saat onboarding, masukkan keyword spesifik seperti "data analyst Jakarta WFH" atau "frontend developer remote startup", aktifkan notifikasi WhatsApp di Settings, dan tunggu notifikasi masuk.</p>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Tips Keyword Lowongan yang Efektif</h2>
        <p>Keyword yang terlalu umum seperti "programmer" akan menghasilkan ratusan notifikasi tidak relevan. Gunakan kombinasi posisi + lokasi + preferensi. Contoh: "product manager fintech Jakarta hybrid" atau "UI UX designer startup remote gaji 10 juta".</p>
      </div>
      <div style={{marginTop:'48px',padding:'24px',background:'#E8F0FB',borderRadius:'16px',textAlign:'center'}}>
        <h3 style={{fontWeight:800,fontSize:'18px',color:'#0D1B2A',marginBottom:'8px'}}>Siap Mulai Memantau?</h3>
        <p style={{color:'#5A7090',fontSize:'14px',marginBottom:'16px'}}>Daftar gratis dan terima notifikasi pertama dalam 5 menit.</p>
        <a href="/register" style={{display:'inline-block',padding:'12px 28px',background:'#1560BD',color:'white',borderRadius:'10px',fontWeight:700,textDecoration:'none',fontSize:'14px'}}>
          Daftar Gratis Sekarang
        </a>
      </div>
    </div>
  )
}
