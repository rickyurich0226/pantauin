import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog — Tips & Panduan Monitoring Peluang Bisnis',
  description: 'Artikel tips monitoring tender, properti, dan peluang bisnis otomatis menggunakan pantau.in.',
  alternates: { canonical: 'https://pantau.in/blog' },
}

const ARTICLES = [
  {
    slug: 'cara-pantau-tender-lpse-otomatis',
    title: 'Cara Pantau Tender LPSE Secara Otomatis dan Dapat Notifikasi Real-Time',
    excerpt: 'Lelah buka LPSE setiap hari tapi sering ketinggalan tender? Pelajari cara otomatisasi monitoring tender pengadaan pemerintah dan swasta dengan notifikasi langsung ke WhatsApp dan Email.',
    date: '20 Juni 2026',
    readTime: '5 menit',
    category: 'Tender & Pengadaan',
    categoryColor: '#1560BD',
  },
  {
    slug: 'cara-dapat-notifikasi-properti-murah',
    title: 'Cara Dapat Notifikasi Properti Murah Sebelum Orang Lain Tahu',
    excerpt: 'Properti murah selalu habis dalam hitungan jam. Pelajari strategi monitoring listing properti secara real-time agar kamu selalu jadi yang pertama tahu.',
    date: '22 Juni 2026',
    readTime: '4 menit',
    category: 'Properti',
    categoryColor: '#0F6E56',
  },
  {
    slug: 'monitoring-pengadaan-barang-jasa-online',
    title: 'Panduan Monitoring Pengadaan Barang dan Jasa Online untuk Kontraktor',
    excerpt: 'Kontraktor dan vendor yang rajin monitoring pengadaan 3x lebih sering menang tender. Ini panduan lengkap cara monitoring e-procurement secara efisien.',
    date: '24 Juni 2026',
    readTime: '6 menit',
    category: 'Pengadaan',
    categoryColor: '#7C3AED',
  },
]

export default function BlogPage() {
  return (
    <div style={{minHeight:'100vh',background:'#F0F4F9',fontFamily:'Inter,sans-serif'}}>
      <nav style={{background:'white',borderBottom:'1px solid #DDE5EF',padding:'16px clamp(16px,4vw,40px)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'22px',fontWeight:800,textDecoration:'none'}}>
          <span style={{color:'#0D1B2A'}}>pantau</span><span style={{color:'#0F6E56'}}>.in</span>
        </a>
        <div style={{display:'flex',gap:'24px',alignItems:'center'}}>
          <a href="/#pricing" style={{fontSize:'14px',color:'#5A7090',textDecoration:'none'}}>Harga</a>
          <a href="/blog" style={{fontSize:'14px',color:'#1560BD',fontWeight:600,textDecoration:'none'}}>Blog</a>
          <a href="/register" style={{fontSize:'14px',fontWeight:700,color:'white',background:'#1560BD',padding:'8px 20px',borderRadius:'8px',textDecoration:'none'}}>Daftar Gratis</a>
        </div>
      </nav>

      <div style={{maxWidth:'860px',margin:'0 auto',padding:'48px 24px'}}>
        <div style={{marginBottom:'40px'}}>
          <p style={{fontSize:'12px',fontWeight:700,color:'#0F6E56',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'8px'}}>Blog</p>
          <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'36px',fontWeight:800,color:'#0D1B2A',marginBottom:'12px'}}>Tips & Panduan Monitoring Peluang</h1>
          <p style={{color:'#5A7090',fontSize:'16px'}}>Strategi praktis untuk menemukan tender, properti, dan peluang bisnis lebih cepat dari kompetitor.</p>
        </div>

        <div style={{display:'grid',gap:'20px'}}>
          {ARTICLES.map(a=>(
            <a key={a.slug} href={'/blog/'+a.slug} style={{background:'white',borderRadius:'16px',padding:'28px',textDecoration:'none',color:'#0D1B2A',border:'1px solid #DDE5EF',display:'block',transition:'box-shadow .2s'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:a.categoryColor+'15',color:a.categoryColor}}>{a.category}</span>
                <span style={{fontSize:'12px',color:'#9EB3C8'}}>{a.date}</span>
                <span style={{fontSize:'12px',color:'#9EB3C8'}}>· {a.readTime} baca</span>
              </div>
              <h2 style={{fontSize:'20px',fontWeight:700,marginBottom:'10px',lineHeight:1.4}}>{a.title}</h2>
              <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.7,margin:0}}>{a.excerpt}</p>
              <p style={{fontSize:'13px',fontWeight:600,color:'#1560BD',marginTop:'16px',margin:'16px 0 0'}}>Baca selengkapnya →</p>
            </a>
          ))}
        </div>

        <div style={{marginTop:'48px',background:'linear-gradient(135deg,#1560BD,#0F6E56)',borderRadius:'16px',padding:'32px',textAlign:'center',color:'white'}}>
          <h3 style={{fontSize:'22px',fontWeight:800,marginBottom:'8px'}}>Mau monitoring otomatis tanpa ribet?</h3>
          <p style={{opacity:.85,marginBottom:'20px',fontSize:'14px'}}>Pantau.in memindai ribuan sumber online setiap 5 menit dan kirim notifikasi langsung ke kamu.</p>
          <a href="/register" style={{background:'white',color:'#1560BD',fontWeight:700,padding:'12px 28px',borderRadius:'10px',textDecoration:'none',fontSize:'15px',display:'inline-block'}}>Coba Gratis Sekarang →</a>
        </div>
      </div>
    </div>
  )
}
