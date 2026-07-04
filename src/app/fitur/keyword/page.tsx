import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Pantau Keyword Apapun — Pantau.in',
  description: 'Pantau kata kunci bisnis, tender, berita industri, atau topik apapun dari internet Indonesia secara real-time.',
  alternates: { canonical: 'https://pantau.in/fitur/keyword' },
}
export default function KeywordPage() {
  return (
    <main style={{maxWidth:'800px',margin:'0 auto',padding:'clamp(32px,5vw,60px) clamp(16px,3vw,24px)',fontFamily:'Inter, sans-serif'}}>
      <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none',display:'block',marginBottom:'32px'}}>← Beranda</a>
      <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#E8F0FB',borderRadius:'100px',padding:'6px 16px',marginBottom:'20px'}}>
        <span style={{fontSize:'12px',fontWeight:600,color:'#1560BD'}}>Fitur</span>
      </div>
      <h1 style={{fontSize:'clamp(28px,5vw,42px)',fontWeight:800,color:'#0D1B2A',marginBottom:'16px',lineHeight:1.2}}>Pantau Kata Kunci Apapun dari Internet</h1>
      <p style={{fontSize:'18px',color:'#5A7090',marginBottom:'48px',lineHeight:1.7}}>Tidak ada batasan topik. Tulis dalam bahasa natural, dan AI kami yang memahami apa yang kamu cari.</p>

      <section style={{marginBottom:'48px'}}>
        <h2 style={{fontSize:'20px',fontWeight:700,color:'#0D1B2A',marginBottom:'20px'}}>Contoh Kata Kunci yang Bisa Dipantau</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
          {[
            {cat:'Bisnis & Tender',items:['tender konstruksi Surabaya','pengadaan IT Kementerian','lelang aset BUMN','proyek infrastruktur 2026'],color:'#E8F0FB',accent:'#1560BD'},
            {cat:'Properti',items:['kavling murah pinggir tol','ruko strategis Jakarta Selatan','apartemen baru Bekasi','proyek developer Tangerang'],color:'#E1F5EE',accent:'#0F6E56'},
            {cat:'Industri & Bisnis',items:['berita harga CPO naik','regulasi ekspor mineral','kebijakan impor baja','tren e-commerce 2026'],color:'#FEF3C7',accent:'#92400E'},
            {cat:'Karir & SDM',items:['lowongan data scientist remote','rekrutmen BUMN 2026','program magang startup','beasiswa S2 luar negeri'],color:'#EDE9FE',accent:'#7C3AED'},
          ].map(cat => (
            <div key={cat.cat} style={{background:cat.color,borderRadius:'12px',padding:'20px'}}>
              <h3 style={{fontWeight:700,fontSize:'13px',color:cat.accent,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'12px'}}>{cat.cat}</h3>
              {cat.items.map(item => (
                <div key={item} style={{fontSize:'13px',color:'#5A7090',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>"{item}"</div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section style={{marginBottom:'48px',background:'#F8FAFC',borderRadius:'16px',padding:'28px'}}>
        <h2 style={{fontSize:'20px',fontWeight:700,color:'#0D1B2A',marginBottom:'16px'}}>Fitur Filtering Lanjutan (Pro)</h2>
        <div style={{display:'grid',gap:'12px'}}>
          {[
            ['Wajib Ada (mustInclude)','Pastikan semua kata tertentu selalu muncul dalam konten. Contoh: "tender" + "konstruksi" + "Jawa Barat" harus semua ada.'],
            ['Kata Pengecualian (exclude)','Saring kata kunci yang tidak relevan. Contoh: pantau "tender gedung" tapi kecualikan "renovasi" dan "perbaikan".'],
            ['Filter Kategori','Fokus pada kategori tertentu — Tender, Properti, Kendaraan, Bisnis, Investasi, Lowongan, Beasiswa, atau Bantuan Pemerintah.'],
          ].map(([t, d]) => (
            <div key={t as string} style={{display:'flex',gap:'12px',padding:'16px',background:'white',borderRadius:'10px',border:'1px solid #E8EEF5'}}>
              <span style={{color:'#0F6E56',fontWeight:700,flexShrink:0}}>✓</span>
              <div>
                <p style={{fontWeight:600,fontSize:'14px',color:'#0D1B2A',marginBottom:'4px'}}>{t as string}</p>
                <p style={{fontSize:'13px',color:'#5A7090',lineHeight:1.6,margin:0}}>{d as string}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{textAlign:'center'}}>
        <a href="/register" style={{display:'inline-block',background:'#1560BD',color:'white',fontWeight:700,padding:'14px 32px',borderRadius:'12px',fontSize:'15px'}}>Mulai Pantau Sekarang →</a>
      </div>
    </main>
  )
}
