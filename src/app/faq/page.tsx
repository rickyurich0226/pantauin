'use client'
import { useState } from 'react'
import { useContact } from '@/lib/useContact'
const FAQS = [
  ['Apa itu Pantau.in?','Platform monitoring real-time yang memindai ribuan sumber online menggunakan AI, lalu mengirim notifikasi ke WhatsApp/Email/Telegram saat ada konten baru yang cocok dengan kata kunci kamu.'],
  ['Bagaimana cara kerja notifikasi?','Buat pantauan baru — tulis apa yang ingin dipantau dalam bahasa natural. AI menyisir sumber setiap menit dan mengirim notifikasi ke Email, WhatsApp, atau Telegram.'],
  ['Berapa lama deteksi peluang baru?','Plan Pro & Business: real-time (menit). Plan Gratis: digest harian.'],
  ['Apakah data saya aman?','Ya. SSL/TLS, bcrypt password, tidak jual data ke pihak ketiga, audit berkala.'],
  ['Bagaimana cara upgrade ke Pro?','Dashboard → Upgrade Plan → pilih plan & metode bayar → bayar via Midtrans. Plan aktif otomatis.'],
  ['Metode pembayaran apa?','Transfer bank (BCA/Mandiri/BNI/BRI), Kartu Kredit/Debit, QRIS, GoPay, OVO, ShopeePay via Midtrans.'],
  ['Bisakah coba Pro sebelum bayar?','Plan Gratis tersedia selamanya dengan 3 Pantau.in. Tidak perlu kartu kredit.'],
  ['Bagaimana setup notifikasi WhatsApp?','Upgrade Pro → Pengaturan → pilih channel WhatsApp → masukkan nomor WA → simpan.'],
  ['Apakah bisa pantau lebih dari 1 kota?','Ya! Buat Pantau.in terpisah per kota, atau kosongkan lokasi untuk Pantau.in nasional.'],
  ['Bagaimana cara batalkan langganan?','Dashboard → Pengaturan → Batalkan Langganan. Plan kembali ke Free setelah periode billing berakhir.'],
  ['Apakah ada API untuk developer?','Ya, tersedia di plan Business. REST API dengan dokumentasi lengkap.'],
  ['Sumber data apa saja?','Ribuan sumber online — media nasional, media daerah, portal berita industri, dan situs pengumuman publik yang terindeks di internet.'],
]
export default function FAQ() {
  const [open, setOpen] = useState<number|null>(0)
  const { email, wa } = useContact()
  return (
    <div style={{minHeight:'100vh',background:'#F0F4F9',fontFamily:'Inter,sans-serif'}}>
      <nav style={{background:'white',borderBottom:'1px solid #DDE5EF',padding:'0 16px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{display:"flex",alignItems:"center",gap:"8px",textDecoration:"none"}}><img src="/logo.png" alt="pantau.in" style={{height:"32px",objectFit:"contain"}}/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'20px',fontWeight:800}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></a>
        <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none'}}>← Beranda</a>
      </nav>
      <div style={{maxWidth:'760px',margin:'0 auto',padding:'clamp(24px,5vw,56px) clamp(16px,3vw,24px)'}}>
        <div style={{textAlign:'center',marginBottom:'40px'}}>
          <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'36px',fontWeight:800,marginBottom:'12px'}}>FAQ</h1>
          <p style={{color:'#5A7090'}}>Tidak menemukan jawaban? <a href={`mailto:${email}`} style={{color:'#1560BD'}}>{email}</a></p>
        </div>
        {FAQS.map(([q,a],i) => (
          <div key={i} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'12px',overflow:'hidden',marginBottom:'8px'}}>
            <button onClick={()=>setOpen(open===i?null:i)} style={{width:'100%',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
              <span style={{fontWeight:600,fontSize:'15px',color:'#0D1B2A',paddingRight:'16px'}}>{q}</span>
              <span style={{fontSize:'20px',color:'#9EB3C8',flexShrink:0,transform:open===i?'rotate(45deg)':'none',transition:'transform .2s'}}>+</span>
            </button>
            {open===i&&<div style={{padding:'0 24px 18px',borderTop:'1px solid #F1F5F9'}}><p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.8,margin:'14px 0 0'}}>{a}</p></div>}
          </div>
        ))}
        <div style={{marginTop:'40px',background:'linear-gradient(135deg,#1560BD,#0F6E56)',borderRadius:'16px',padding:'28px',textAlign:'center'}}>
          <h3 style={{fontWeight:800,color:'white',fontSize:'18px',marginBottom:'8px'}}>Masih ada pertanyaan?</h3>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap',marginTop:'16px'}}>
            <a href={`mailto:${email}`} style={{background:'white',color:'#1560BD',fontWeight:700,padding:'10px 20px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>📧 Email Kami</a>
            <a href={wa} style={{background:'rgba(255,255,255,0.15)',color:'white',fontWeight:600,padding:'10px 20px',borderRadius:'10px',textDecoration:'none',fontSize:'14px',border:'1px solid rgba(255,255,255,0.3)'}}>💬 WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  )
}

