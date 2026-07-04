'use client'
import { useContact } from '@/lib/useContact'
export default function AboutPage() {
  const { email } = useContact()
  return (
    <main style={{maxWidth:'800px',margin:'0 auto',padding:'clamp(32px,5vw,60px) clamp(16px,3vw,24px)',fontFamily:'Inter, sans-serif'}}>
      <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none',display:'block',marginBottom:'32px'}}>← Beranda</a>
      <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#E8F0FB',borderRadius:'100px',padding:'6px 16px',marginBottom:'20px'}}>
        <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#1560BD',display:'inline-block'}}/>
        <span style={{fontSize:'12px',fontWeight:600,color:'#1560BD'}}>Tentang Kami</span>
      </div>
      <h1 style={{fontSize:'clamp(28px,5vw,42px)',fontWeight:800,color:'#0D1B2A',marginBottom:'16px',lineHeight:1.2}}>Internet Indonesia Dipantau.<br/>Peluang Dikirim ke WA Kamu.</h1>
      <p style={{fontSize:'18px',color:'#5A7090',marginBottom:'48px',lineHeight:1.7}}>Pantau.in adalah sistem intelijen peluang berbasis AI — memindai konten publik di internet dan mengirim notifikasi real-time ke WhatsApp, Email, atau Telegram saat ada informasi yang cocok dengan kata kunci kamu.</p>
      <section style={{marginBottom:'48px'}}>
        <h2 style={{fontSize:'22px',fontWeight:700,color:'#0D1B2A',marginBottom:'16px'}}>Misi Kami</h2>
        <p style={{color:'#5A7090',lineHeight:1.8,fontSize:'16px'}}>Kami percaya bahwa informasi yang datang terlambat sama saja dengan tidak ada informasi. Pantau.in hadir untuk memastikan kamu selalu menjadi yang pertama tahu — saat ada pengumuman tender, berita industri, atau informasi bisnis apapun yang relevan dengan kebutuhanmu.</p>
      </section>
      <section style={{marginBottom:'48px'}}>
        <h2 style={{fontSize:'22px',fontWeight:700,color:'#0D1B2A',marginBottom:'16px'}}>Cara Kerja</h2>
        <div style={{display:'grid',gap:'16px'}}>
          {[
            ['01','Kamu tulis kata kunci','Tulis apa yang ingin dipantau dalam bahasa natural. AI kami yang akan memahami konteksnya.'],
            ['02','Sistem memindai internet','Setiap 5 menit, Pantau.in memindai ribuan sumber online — media nasional, media daerah, dan portal berita industri.'],
            ['03','AI mencocokkan konten','Algoritma kami menghitung relevansi setiap artikel. Hanya konten yang benar-benar relevan yang lolos filter.'],
            ['04','Alert langsung ke kamu','Notifikasi dikirim real-time ke WhatsApp, Email, atau Telegram pilihanmu.'],
          ].map(([num, title, desc]) => (
            <div key={num as string} style={{display:'flex',gap:'20px',padding:'20px',background:'#F8FAFC',borderRadius:'12px',border:'1px solid #E8EEF5'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#1560BD',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'13px',flexShrink:0}}>{num as string}</div>
              <div>
                <h3 style={{fontWeight:700,fontSize:'15px',color:'#0D1B2A',marginBottom:'6px'}}>{title as string}</h3>
                <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.7,margin:0}}>{desc as string}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={{marginBottom:'48px'}}>
        <h2 style={{fontSize:'22px',fontWeight:700,color:'#0D1B2A',marginBottom:'16px'}}>Kenapa Pantau.in?</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
          {[
            ['⚡','Real-time','Notifikasi dalam menit setelah konten baru muncul di internet.'],
            ['🤖','AI Matching','Memahami konteks dan relevansi, bukan sekadar pencocokan kata kaku.'],
            ['📡','Coverage Luas','Ribuan sumber online dipindai — dari media nasional hingga portal daerah.'],
            ['🔒','Privasi Terjaga','Data kamu dienkripsi AES-256. Tidak pernah dijual ke pihak ketiga.'],
            ['📱','Multi-Channel','Notifikasi ke WhatsApp, Email, atau Telegram sesuai preferensimu.'],
            ['💰','Mulai Gratis','Coba tanpa kartu kredit. Upgrade kapan saja jika butuh lebih.'],
          ].map(([icon, title, desc]) => (
            <div key={title as string} style={{background:'white',borderRadius:'12px',padding:'20px',border:'1px solid #E8EEF5'}}>
              <div style={{fontSize:'28px',marginBottom:'10px'}}>{icon as string}</div>
              <h3 style={{fontWeight:700,fontSize:'14px',marginBottom:'6px',color:'#0D1B2A'}}>{title as string}</h3>
              <p style={{fontSize:'13px',color:'#5A7090',lineHeight:1.6,margin:0}}>{desc as string}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',borderRadius:'16px',padding:'32px',textAlign:'center',color:'white'}}>
        <h2 style={{fontSize:'22px',fontWeight:700,marginBottom:'12px'}}>Siap Mulai?</h2>
        <p style={{opacity:0.8,marginBottom:'24px',fontSize:'15px'}}>Daftar gratis, tidak perlu kartu kredit. Aktif dalam 90 detik.</p>
        <a href="/register" style={{display:'inline-block',background:'white',color:'#1560BD',fontWeight:700,padding:'12px 28px',borderRadius:'10px',fontSize:'15px'}}>Coba Gratis Sekarang →</a>
      </section>
      <section style={{marginTop:'48px'}}>
        <h2 style={{fontSize:'22px',fontWeight:700,color:'#0D1B2A',marginBottom:'12px'}}>Kontak</h2>
        <p style={{color:'#5A7090',lineHeight:1.8}}>Ada pertanyaan atau masukan? Hubungi kami di <a href={`mailto:${email}`} style={{color:'#1560BD',fontWeight:600}}>{email}</a> atau melalui <a href="/pusat-bantuan" style={{color:'#1560BD',fontWeight:600}}>Pusat Bantuan</a>.</p>
      </section>
    </main>
  )
}

