import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Cara Kerja Pantau.in',
  description: 'Pelajari bagaimana Pantau.in memindai internet Indonesia dan mengirim alert real-time ke WhatsApp kamu.',
  alternates: { canonical: 'https://pantau.in/cara-kerja' },
}
export default function CaraKerjaPage() {
  return (
    <main style={{maxWidth:'800px',margin:'0 auto',padding:'clamp(32px,5vw,60px) clamp(16px,3vw,24px)',fontFamily:'Inter, sans-serif'}}>
      <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none',display:'block',marginBottom:'32px'}}>← Beranda</a>
      <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#E1F5EE',borderRadius:'100px',padding:'6px 16px',marginBottom:'20px'}}>
        <span style={{fontSize:'12px',fontWeight:600,color:'#0F6E56'}}>Cara Kerja</span>
      </div>
      <h1 style={{fontSize:'clamp(28px,5vw,42px)',fontWeight:800,color:'#0D1B2A',marginBottom:'16px',lineHeight:1.2}}>Bagaimana Pantau.in Bekerja?</h1>
      <p style={{fontSize:'18px',color:'#5A7090',marginBottom:'48px',lineHeight:1.7}}>Tiga langkah sederhana dari setup hingga menerima alert pertama — semua bisa selesai dalam 90 detik.</p>

      <div style={{display:'grid',gap:'24px',marginBottom:'48px'}}>
        {[
          {n:'01',icon:'🎯',t:'Tulis Kata Kunci',d:'Masuk ke dashboard dan klik "Tambah Pantauan". Tulis apa yang ingin kamu pantau dalam bahasa natural — "tender jalan tol Jawa Tengah", "berita kenaikan harga CPO", atau "pengumuman beasiswa S2 dalam negeri". AI kami yang akan memahami konteksnya.',color:'#E8F0FB',accent:'#1560BD'},
          {n:'02',icon:'🤖',t:'Sistem Memindai Internet',d:'Setiap 5 menit, crawler kami memindai ribuan sumber online yang terindeks — media nasional (Kompas, Detik, Tempo, Antara), media daerah, portal berita industri, dan situs pengumuman publik. Semua dipindai secara otomatis 24 jam sehari, 7 hari seminggu.',color:'#E1F5EE',accent:'#0F6E56'},
          {n:'03',icon:'📱',t:'Terima Alert Real-time',d:'Begitu ada artikel atau pengumuman baru yang relevan ditemukan, sistem langsung mengirim notifikasi ke channel pilihanmu — WhatsApp (Pro), Email (semua plan), atau Telegram (Pro). Kamu langsung bisa klik link dan baca kontennya.',color:'#FEF3C7',accent:'#92400E'},
        ].map(step => (
          <div key={step.n} style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'20px',padding:'28px',background:step.color,borderRadius:'16px'}}>
            <div style={{width:'48px',height:'48px',borderRadius:'50%',background:step.accent,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'16px',flexShrink:0}}>{step.n}</div>
            <div>
              <div style={{fontSize:'28px',marginBottom:'8px'}}>{step.icon}</div>
              <h2 style={{fontWeight:700,fontSize:'18px',color:'#0D1B2A',marginBottom:'10px'}}>{step.t}</h2>
              <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.75,margin:0}}>{step.d}</p>
            </div>
          </div>
        ))}
      </div>

      <section style={{marginBottom:'48px',background:'#F8FAFC',borderRadius:'16px',padding:'28px'}}>
        <h2 style={{fontSize:'20px',fontWeight:700,color:'#0D1B2A',marginBottom:'20px'}}>Pertanyaan Umum</h2>
        {[
          ['Berapa lama sampai dapat notifikasi pertama?','Sistem memindai sumber baru setiap 5 menit. Notifikasi pertama biasanya datang dalam 5-10 menit jika ada konten yang cocok dengan kata kunci kamu.'],
          ['Sumber mana saja yang dipantau?','Pantau.in memindai ribuan sumber yang terindeks di internet — media nasional, media daerah, portal berita industri, dan situs pengumuman publik. Coverage terus bertambah.'],
          ['Apakah bisa pantau topik apapun?','Ya. Kamu bisa pantau kata kunci bisnis, industri, nama perusahaan, topik tertentu, atau apapun yang relevan dengan kebutuhanmu.'],
          ['Berapa banyak kata kunci yang bisa dipantau?','Plan Free: 3 kata kunci. Plan Pro: unlimited. Plan Business: unlimited + fitur tambahan.'],
        ].map(([q, a]) => (
          <div key={q as string} style={{borderBottom:'1px solid #E8EEF5',paddingBottom:'16px',marginBottom:'16px'}}>
            <p style={{fontWeight:700,fontSize:'14px',color:'#0D1B2A',marginBottom:'6px'}}>{q as string}</p>
            <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.7,margin:0}}>{a as string}</p>
          </div>
        ))}
      </section>

      <div style={{textAlign:'center'}}>
        <a href="/register" style={{display:'inline-block',background:'#1560BD',color:'white',fontWeight:700,padding:'14px 32px',borderRadius:'12px',fontSize:'15px'}}>Coba Gratis Sekarang →</a>
      </div>
    </main>
  )
}
