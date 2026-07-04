import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Alert WhatsApp & Email — Pantau.in',
  description: 'Terima notifikasi real-time via WhatsApp, Email, atau Telegram begitu ada konten baru yang cocok dengan kata kunci kamu.',
  alternates: { canonical: 'https://pantau.in/fitur/notifikasi' },
}
export default function NotifikasiPage() {
  return (
    <main style={{maxWidth:'800px',margin:'0 auto',padding:'clamp(32px,5vw,60px) clamp(16px,3vw,24px)',fontFamily:'Inter, sans-serif'}}>
      <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none',display:'block',marginBottom:'32px'}}>← Beranda</a>
      <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#E8F0FB',borderRadius:'100px',padding:'6px 16px',marginBottom:'20px'}}>
        <span style={{fontSize:'12px',fontWeight:600,color:'#1560BD'}}>Fitur</span>
      </div>
      <h1 style={{fontSize:'clamp(28px,5vw,42px)',fontWeight:800,color:'#0D1B2A',marginBottom:'16px',lineHeight:1.2}}>Alert Real-time ke WhatsApp, Email & Telegram</h1>
      <p style={{fontSize:'18px',color:'#5A7090',marginBottom:'48px',lineHeight:1.7}}>Begitu ada konten baru yang relevan, Pantau.in langsung mengirim notifikasi ke channel pilihanmu — tanpa delay, tanpa spam.</p>

      <div style={{display:'grid',gap:'20px',marginBottom:'48px'}}>
        {[
          {icon:'💬',t:'WhatsApp (Pro & Business)',d:'Notifikasi langsung ke nomor WhatsApp kamu. Format pesan sudah dioptimalkan untuk mobile — judul, sumber, dan link langsung bisa diklik. Aktifkan di Settings → Notifikasi.',badge:'Pro',color:'#E1F5EE',accent:'#0F6E56'},
          {icon:'📧',t:'Email (Semua Plan)',d:'Tersedia untuk semua pengguna termasuk Free. Notifikasi dikirim dengan format HTML yang rapi, mencantumkan judul artikel, sumber, dan link langsung. Masuk ke inbox, bukan spam.',badge:'Free',color:'#E8F0FB',accent:'#1560BD'},
          {icon:'✈️',t:'Telegram (Pro & Business)',d:'Hubungkan akun Telegram kamu dengan mengikuti bot @pantauinbot dan salin Chat ID ke Settings. Notifikasi real-time dengan format Markdown yang bersih.',badge:'Pro',color:'#F0F3FF',accent:'#4A6CF7'},
        ].map(ch => (
          <div key={ch.t} style={{padding:'24px',background:ch.color,borderRadius:'16px',display:'flex',gap:'20px',alignItems:'flex-start'}}>
            <div style={{fontSize:'36px',flexShrink:0}}>{ch.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'8px'}}>
                <h2 style={{fontWeight:700,fontSize:'17px',color:'#0D1B2A',margin:0}}>{ch.t}</h2>
                <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'100px',background:ch.accent,color:'white',fontWeight:700}}>{ch.badge}</span>
              </div>
              <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.7,margin:0}}>{ch.d}</p>
            </div>
          </div>
        ))}
      </div>

      <section style={{marginBottom:'48px',background:'#0D1B2A',borderRadius:'16px',padding:'28px',color:'white'}}>
        <h2 style={{fontSize:'18px',fontWeight:700,marginBottom:'16px'}}>Contoh Notifikasi WhatsApp</h2>
        <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'12px',padding:'16px',fontFamily:'monospace',fontSize:'13px',lineHeight:1.8}}>
          <p style={{margin:0}}>🔍 <strong>Peluang Baru — Pantau.in</strong></p>
          <p style={{margin:0}}></p>
          <p style={{margin:0}}>Tender Pengadaan Server Kementerian PUPR 2026</p>
          <p style={{margin:0}}></p>
          <p style={{margin:0}}>🎯 Relevansi AI: <strong>94%</strong></p>
          <p style={{margin:0}}>🔗 https://pantau.in/dashboard</p>
          <p style={{margin:0}}></p>
          <p style={{margin:0,opacity:0.6}}>Pantau.in — Internet Dipantau, Peluang Dikirim ke WA Kamu</p>
        </div>
      </section>

      <div style={{textAlign:'center'}}>
        <a href="/register" style={{display:'inline-block',background:'#1560BD',color:'white',fontWeight:700,padding:'14px 32px',borderRadius:'12px',fontSize:'15px',marginRight:'12px'}}>Mulai Gratis →</a>
        <a href="/#pricing" style={{display:'inline-block',background:'white',color:'#1560BD',fontWeight:700,padding:'14px 32px',borderRadius:'12px',fontSize:'15px',border:'2px solid #1560BD'}}>Lihat Harga</a>
      </div>
    </main>
  )
}
