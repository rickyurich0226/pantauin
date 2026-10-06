'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  tender: { label: 'Tender & Pengadaan', emoji: '📋', desc: 'Tender pengadaan & swasta terbaru' },
  properti: { label: 'Properti', emoji: '🏠', desc: 'Rumah, tanah, dan ruko dijual terbaru' },
  kendaraan: { label: 'Kendaraan', emoji: '🚗', desc: 'Mobil dan motor bekas terbaru' },
  bisnis: { label: 'Peluang Bisnis', emoji: '💼', desc: 'Franchise dan peluang usaha terbaru' },
  investasi: { label: 'Investasi', emoji: '📈', desc: 'Peluang investasi terbaru' },
  lowongan: { label: 'Lowongan Kerja', emoji: '👔', desc: 'Lowongan kerja terbaru' },
  loker: { label: 'Lowongan Kerja', emoji: '👔', desc: 'Lowongan kerja terbaru' },
  tanah: { label: 'Properti', emoji: '🏠', desc: 'Rumah, tanah, dan ruko dijual terbaru' },
  rumah: { label: 'Properti', emoji: '🏠', desc: 'Rumah, tanah, dan ruko dijual terbaru' },
  mobil: { label: 'Kendaraan', emoji: '🚗', desc: 'Mobil dan motor bekas terbaru' },
  motor: { label: 'Kendaraan', emoji: '🚗', desc: 'Mobil dan motor bekas terbaru' },
  beasiswa: { label: 'Beasiswa', emoji: '🎓', desc: 'Info beasiswa dalam dan luar negeri' },
  bantuan: { label: 'Bantuan & Subsidi', emoji: '🤝', desc: 'Info bantuan & subsidi terbaru' },
}

export default function PublicListingPage() {
  const params = useParams()
  const category = String(params.category || '').toLowerCase()
  const info = CATEGORY_LABELS[category]
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!info) return
    const apiCategory = info.label === 'Lowongan Kerja' ? 'lowongan' : info.label === 'Properti' ? 'properti' : info.label === 'Kendaraan' ? 'kendaraan' : category
    fetch(`/api/public/listings?category=${apiCategory}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.items) setItems(d.items) })
      .finally(() => setLoading(false))
  }, [category])

  if (!info) {
    return <div style={{padding:'60px 20px', textAlign:'center'}}>Kategori tidak ditemukan.</div>
  }

  return (
    <div style={{minHeight:'100vh', background:'#F8FAFC'}}>
      <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)', padding:'40px 20px', textAlign:'center'}}>
        <a href="/" style={{color:'white', fontSize:'20px', fontWeight:800, textDecoration:'none'}}>pantau<span style={{color:'#00C2FF'}}>.in</span></a>
        <h1 style={{color:'white', fontSize:'clamp(24px,4vw,36px)', fontWeight:800, margin:'20px 0 8px'}}>{info.emoji} {info.label} Terbaru</h1>
        <p style={{color:'rgba(255,255,255,0.8)', fontSize:'15px', margin:0}}>{info.desc} — update otomatis setiap hari</p>
      </div>
      <div style={{maxWidth:'720px', margin:'0 auto', padding:'32px 16px'}}>
        {loading && <p style={{textAlign:'center', color:'#5A7090'}}>⏳ Memuat...</p>}
        {!loading && items.length === 0 && <p style={{textAlign:'center', color:'#5A7090'}}>Belum ada data terbaru.</p>}
        {items.map((item, i) => (
          <a key={i} href={item.url || '#'} target="_blank" rel="noopener noreferrer" style={{display:'block', background:'white', border:'1px solid #DDE5EF', borderRadius:'12px', padding:'16px 20px', marginBottom:'12px', textDecoration:'none', color:'#0D1B2A'}}>
            <p style={{fontWeight:600, fontSize:'14px', margin:0, lineHeight:1.5}}>{item.title}</p>
          </a>
        ))}
        <div style={{background:'linear-gradient(135deg,#0F6E56,#1560BD)', borderRadius:'16px', padding:'28px 24px', textAlign:'center', marginTop:'32px'}}>
          <p style={{color:'white', fontWeight:800, fontSize:'18px', margin:'0 0 8px'}}>Mau dapat notifikasi otomatis?</p>
          <p style={{color:'rgba(255,255,255,0.85)', fontSize:'14px', margin:'0 0 20px'}}>Daftar gratis, atur kata kunci sesuai kebutuhanmu, dan dapatkan notifikasi langsung ke WhatsApp, Telegram, atau Email.</p>
          <a href="/register" style={{display:'inline-block', background:'white', color:'#0F6E56', fontWeight:700, padding:'12px 28px', borderRadius:'10px', textDecoration:'none', fontSize:'14px'}}>Daftar Gratis Sekarang →</a>
        </div>
      </div>
    </div>
  )
}
