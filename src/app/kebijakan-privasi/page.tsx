'use client'
import { useContact } from '@/lib/useContact'
export default function KebijakanPrivasi() {
  const { email } = useContact()
  const sections = [
    ['Data yang Kami Kumpulkan','Nama, email, nomor WhatsApp (opsional), Telegram ID (opsional), preferensi notifikasi, watch queries, dan riwayat notifikasi. Kami tidak menyimpan data kartu kredit — diproses langsung oleh Midtrans.'],
    ['Bagaimana Kami Menggunakan Data','Untuk menyediakan layanan notifikasi, mencocokkan peluang dengan AI, mengirim notifikasi ke channel pilihan, dan meningkatkan akurasi sistem.'],
    ['Berbagi Data','TIDAK menjual data. Data hanya dibagikan ke: WhatsApp Business API (Meta), Telegram Bot API, Midtrans (pembayaran), OpenAI (analisis semantik — tanpa data identitas).'],
    ['Keamanan Data','Enkripsi SSL/TLS untuk semua transmisi. Password di-hash bcrypt. Database diproteksi firewall. Backup otomatis harian.'],
    ['Retensi Data','Akun: selama aktif. Riwayat notifikasi: 7 hari (Free), 90 hari (Pro), 1 tahun (Business). Setelah hapus akun, data dihapus dalam 30 hari.'],
    ['Hak Kamu','Akses, perbarui, hapus data. Ekspor data JSON. Tarik persetujuan kapan saja. Hubungi {email}.'],
    ['Cookie','Hanya cookie session untuk login dan keamanan. Tidak ada cookie iklan atau tracking pihak ketiga.'],
    ['Kontak Privacy','Email: {email} | WhatsApp: @pantauin'],
  ]
  return (
    <div style={{minHeight:'100vh',background:'#F0F4F9',fontFamily:'Inter,sans-serif'}}>
      <nav style={{background:'white',borderBottom:'1px solid #DDE5EF',padding:'0 16px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{display:"flex",alignItems:"center",gap:"8px",textDecoration:"none"}}><img src="/logo.png" alt="pantau.in" style={{height:"32px",objectFit:"contain"}}/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'20px',fontWeight:800}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></a>
        <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none'}}>← Beranda</a>
      </nav>
      <div style={{maxWidth:'760px',margin:'0 auto',padding:'clamp(24px,5vw,56px) clamp(16px,3vw,24px)'}}>
        <div style={{background:'white',borderRadius:'16px',padding:'clamp(20px,4vw,48px)',border:'1px solid #DDE5EF'}}>
          <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'32px',fontWeight:800,marginBottom:'8px'}}>Kebijakan Privasi</h1>
          <p style={{color:'#9EB3C8',fontSize:'14px',marginBottom:'40px'}}>Terakhir diperbarui: 1 Juni 2025</p>
          {sections.map(([t,c],i) => (
            <div key={i} style={{marginBottom:'28px'}}>
              <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'17px',fontWeight:700,marginBottom:'8px'}}>{i+1}. {t}</h2>
              <p style={{fontSize:'15px',color:'#5A7090',lineHeight:1.8,margin:0}}>{c}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

