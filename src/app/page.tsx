'use client'
import { useState, useEffect } from 'react'

const DEFAULT = {
  site_name:'Pantau.in', contact_email:'pantau.inofficial@gmail.com',
  contact_wa:'https://wa.me/6287890144122', contact_wa_label:'@pantauin',
  telegram_channel:'https://t.me/pantauin',
  footer_fitur:['Cara Kerja Pantau.in','Pantau Keyword Apapun','Alert WhatsApp & Email','Keamanan & Privasi','Tentang Kami'],
  footer_harga:['Plan Gratis','Plan Pro — Rp 49K/bln','Plan Business — Rp 149K/bln','Perbandingan Plan'],
  footer_developer:['API Docs','Changelog','Status Page','SDK & Library'],
  footer_legal:['Syarat & Ketentuan','Kebijakan Privasi','FAQ','Pusat Bantuan'],
}

const safeArr = (a:any):string[] => Array.isArray(a)?a:[]

const LOGO = () => <img src="/logo.png" alt="pantau.in" width={36} height={36} style={{objectFit:"contain"}}/>

function RoiCalculator() {
  const [tenderVal, setTenderVal] = useState(500)
  const [winRate, setWinRate] = useState(20)
  const [perYear, setPerYear] = useState(3)
  const yearlyRevenue = Math.round(tenderVal * (winRate/100) * perYear * 1000000)
  const proMonthly = 49000
  const proYearly = proMonthly * 12
  const roi = Math.round((yearlyRevenue / proYearly) * 100)
  const fmt = (n:number) => n>=1000000000 ? `Rp ${(n/1000000000).toFixed(1)} M` : n>=1000000 ? `Rp ${(n/1000000).toFixed(0)} Juta` : `Rp ${n.toLocaleString('id-ID')}`
  return (
    <div style={{display:'grid',gap:'16px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'16px'}}>
        {[
          {label:'Nilai rata-rata 1 peluang yang kamu kejar',val:tenderVal,set:setTenderVal,min:5,max:5000,step:5,unit:'Juta Rp',fmt:(v:number)=>`Rp ${v} Juta`},
          {label:'Estimasi win rate kamu (%)',val:winRate,set:setWinRate,min:5,max:80,step:5,unit:'%',fmt:(v:number)=>`${v}%`},
          {label:'Target peluang per tahun',val:perYear,set:setPerYear,min:1,max:24,step:1,unit:'peluang',fmt:(v:number)=>`${v}x/tahun`},
        ].map(item=>(
          <div key={item.label}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <label style={{fontSize:'12px',color:'#5A7090',lineHeight:1.4,maxWidth:'180px'}}>{item.label}</label>
              <span style={{fontSize:'13px',fontWeight:700,color:'#1560BD',whiteSpace:'nowrap',marginLeft:'8px'}}>{item.fmt(item.val)}</span>
            </div>
            <input type="range" min={item.min} max={item.max} step={item.step} value={item.val}
              onChange={e=>item.set(Number(e.target.value))}
              style={{width:'100%',accentColor:'#1560BD'}}/>
          </div>
        ))}
      </div>
      <div style={{background:'white',borderRadius:'14px',padding:'16px 20px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px',border:'1px solid #DDE5EF'}}>
        <div style={{textAlign:'center'}}>
          <p style={{fontSize:'11px',color:'#9EB3C8',textTransform:'uppercase',letterSpacing:'.06em',margin:'0 0 4px'}}>Estimasi Pendapatan/Tahun</p>
          <p style={{fontSize:'22px',fontWeight:800,color:'#0D1B2A',margin:0}}>{fmt(yearlyRevenue)}</p>
        </div>
        <div style={{textAlign:'center'}}>
          <p style={{fontSize:'11px',color:'#9EB3C8',textTransform:'uppercase',letterSpacing:'.06em',margin:'0 0 4px'}}>Biaya Pro / Tahun</p>
          <p style={{fontSize:'22px',fontWeight:800,color:'#1560BD',margin:0}}>Rp 588 Ribu</p>
        </div>
        <div style={{textAlign:'center',background:'#E1F5EE',borderRadius:'10px',padding:'10px'}}>
          <p style={{fontSize:'11px',color:'#0F6E56',textTransform:'uppercase',letterSpacing:'.06em',margin:'0 0 4px',fontWeight:700}}>ROI Berlangganan Pro</p>
          <p style={{fontSize:'26px',fontWeight:800,color:'#0F6E56',margin:0}}>{roi.toLocaleString('id-ID')}x</p>
          <p style={{fontSize:'11px',color:'#0F6E56',margin:'2px 0 0'}}>dari biaya langganan</p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [cfg, setCfg] = useState(DEFAULT)
  const [mobileMenu, setMobileMenu] = useState(false)
  useEffect(()=>{
    fetch('/api/superadmin/content').then(r=>r.ok?r.json():null).then(d=>{
      if(!d||typeof d!=='object') return
      const flat:any={...DEFAULT}
      const fields=['site_name','contact_email','contact_wa','contact_wa_label','telegram_channel']
      fields.forEach(k=>{ if(d[k]) flat[k]=d[k] })
      const arrs=['footer_fitur','footer_harga','footer_developer','footer_legal']
      arrs.forEach(k=>{ if(Array.isArray(d[k])) flat[k]=d[k]; else if(Array.isArray(d.footer_links?.[k.replace('footer_','')])) flat[k]=d.footer_links[k.replace('footer_','')] })
      setCfg(flat)
    }).catch(()=>{})
  },[])

  const PLANS = [
    {key:'FREE',name:'Free',price:0,color:'#64748b',bg:'#F1F5F9',popular:false,
      features:['3 Pantau.in','Notifikasi Email Real-time','5 kategori sumber','Riwayat 7 hari'],
      nope:['WhatsApp/Telegram/Push','Real-time notifikasi','Unlimited queries']},
    {key:'PRO',name:'Pro',price:49000,priceYear:470000,color:'#1560BD',bg:'#E8F0FB',popular:true,
      features:['Unlimited watch queries','Notifikasi real-time','Email+WA+Telegram+Push','Ribuan sumber internet','Riwayat 90 hari','Filter lanjutan'],
      nope:['API Access','Akun tim']},
    {key:'BUSINESS',name:'Business',price:149000,priceYear:1430000,color:'#0F6E56',bg:'#E1F5EE',popular:false,
      features:['Semua fitur Pro','REST API Access','5 akun tim','Custom scraper','Riwayat 1 tahun','Priority support'],
      nope:[]},
  ]
  const legalHref:Record<string,string>={'Syarat & Ketentuan':'/syarat-dan-ketentuan','Kebijakan Privasi':'/kebijakan-privasi','FAQ':'/faq','Pusat Bantuan':'/pusat-bantuan'}

  return (
    <div style={{minHeight:'100vh',fontFamily:'Inter,sans-serif',color:'#0D1B2A',background:'#F0F4F9',width:'100%',overflowX:'hidden'}}>
      <style>{`@keyframes radar{0%{opacity:.7;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(1)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}a{text-decoration:none}@media(max-width:768px){.desktop-nav{display:none!important}.mobile-nav-btn{display:flex!important}}`}</style>

      {/* NAVBAR */}
      <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.96)',backdropFilter:'blur(12px)',borderBottom:'1px solid #DDE5EF'}}>
        <div style={{height:'64px',padding:'0 clamp(16px,4vw,32px)',display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',maxWidth:'100%'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}><LOGO/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'20px',fontWeight:800}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></div>
          {/* Desktop nav */}
          <div className="desktop-nav" style={{display:'flex',gap:'28px'}}>{[['#fitur','Fitur'],['#cara-kerja','Cara Kerja'],['#pricing','Harga']].map(([h,l])=><a key={h} href={h} style={{fontSize:'14px',fontWeight:500,color:'#5A7090'}}>{l}</a>)}</div>
          <div className="desktop-nav" style={{display:'flex',gap:'10px'}}>
            <a href="/login" style={{fontSize:'14px',fontWeight:600,color:'#5A7090',padding:'8px 18px',borderRadius:'8px',border:'1.5px solid #DDE5EF'}}>Masuk</a>
            <a href="/register" style={{fontSize:'14px',fontWeight:700,color:'white',padding:'8px 20px',borderRadius:'8px',background:'#1560BD'}}>Daftar Gratis</a>
          </div>
          {/* Hamburger */}
          <button className="mobile-nav-btn" onClick={()=>setMobileMenu(!mobileMenu)} style={{display:'none',background:'none',border:'none',cursor:'pointer',padding:'8px',flexDirection:'column',gap:'5px'}}>
            <span style={{display:'block',width:'24px',height:'2px',background:'#0D1B2A',borderRadius:'2px',transition:'all .3s',transform:mobileMenu?'rotate(45deg) translateY(7px)':'none'}}/>
            <span style={{display:'block',width:'24px',height:'2px',background:'#0D1B2A',borderRadius:'2px',transition:'all .3s',opacity:mobileMenu?0:1}}/>
            <span style={{display:'block',width:'24px',height:'2px',background:'#0D1B2A',borderRadius:'2px',transition:'all .3s',transform:mobileMenu?'rotate(-45deg) translateY(-7px)':'none'}}/>
          </button>
        </div>
        {/* Mobile menu dropdown */}
        {mobileMenu && <div className="mobile-menu" style={{background:'white',borderTop:'1px solid #DDE5EF',padding:'16px 20px',display:'flex',flexDirection:'column',gap:'12px'}}>
          {[['#fitur','Fitur'],['#cara-kerja','Cara Kerja'],['#pricing','Harga']].map(([h,l])=><a key={h} href={h} onClick={()=>setMobileMenu(false)} style={{fontSize:'15px',fontWeight:500,color:'#5A7090',padding:'8px 0',borderBottom:'1px solid #F1F5F9'}}>{l}</a>)}
          <a href="/login" style={{fontSize:'15px',fontWeight:600,color:'#5A7090',padding:'10px 16px',borderRadius:'8px',border:'1.5px solid #DDE5EF',textAlign:'center',marginTop:'4px'}}>Masuk</a>
          <a href="/register" style={{fontSize:'15px',fontWeight:700,color:'white',padding:'10px 16px',borderRadius:'8px',background:'#1560BD',textAlign:'center'}}>Daftar Gratis</a>
        </div>}
      </nav>

      {/* HERO */}
      <section style={{background:'linear-gradient(135deg,#0D1B2A 0%,#1560BD 55%,#0F6E56 100%)',padding:'clamp(60px,10vw,110px) clamp(16px,4vw,40px) clamp(80px,10vw,130px)',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'50%',right:'6%',transform:'translateY(-50%)',pointerEvents:'none'}}>
          {[70,140,220,300].map((s,i)=><div key={i} style={{position:'absolute',top:'50%',left:'50%',width:s,height:s,borderRadius:'50%',border:'1.5px solid rgba(0,194,255,0.3)',animation:`radar 3s ${i*0.8}s infinite`}}/>)}
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'100px',padding:'7px 18px',marginBottom:'28px',fontSize:'13px',color:'rgba(255,255,255,0.9)',fontWeight:500}}>
          <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#00C2FF',display:'inline-block',animation:'blink 1.5s infinite'}}/>AI-Powered Real-Time Monitoring
        </div>
        <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'clamp(36px,6vw,66px)',fontWeight:800,color:'white',lineHeight:1.12,marginBottom:'20px'}}>
          Temukan Peluang<br/><span style={{color:'#00C2FF'}}>Sebelum Orang Lain</span><br/>Menemukannya.
        </h1>
        <p style={{fontSize:'18px',color:'rgba(255,255,255,0.75)',maxWidth:'560px',margin:'0 auto 40px',lineHeight:1.7}}>Pantau tender, properti, kendaraan, dan peluang bisnis dari 2.400+ sumber. Notifikasi otomatis via WhatsApp, Telegram, atau Email.</p>
        <div style={{display:'flex',gap:'14px',justifyContent:'center',flexWrap:'wrap',marginBottom:'64px'}}>
          <a href="/register" style={{background:'white',color:'#1560BD',fontWeight:700,padding:'15px 36px',borderRadius:'12px',fontSize:'16px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)'}}>🚀 Mulai Gratis — Sekarang</a>
          <a href="#cara-kerja" style={{background:'rgba(255,255,255,0.12)',color:'white',fontWeight:600,padding:'15px 28px',borderRadius:'12px',fontSize:'16px',border:'1.5px solid rgba(255,255,255,0.3)'}}>Lihat Cara Kerja →</a>
        </div>
        <div style={{display:'flex',gap:'48px',justifyContent:'center',flexWrap:'wrap'}}>
          {[['Ribuan','Sumber Dipantau'],['< 5 menit','Waktu Deteksi'],['Gratis','Untuk Mulai'],['24/7','Sistem Aktif']].map(([v,l])=>(
            <div key={l} style={{textAlign:'center'}}><div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'30px',fontWeight:800,color:'white'}}>{v}</div><div style={{fontSize:'13px',color:'rgba(255,255,255,0.6)',marginTop:'4px'}}>{l}</div></div>
          ))}
        </div>
      </section>

      {/* FITUR */}
      <section id="fitur" style={{background:'white',padding:'clamp(40px,6vw,64px) clamp(16px,4vw,40px)'}}>
        <div style={{maxWidth:'1160px',margin:'0 auto',paddingLeft:'clamp(16px,3vw,40px)',paddingRight:'clamp(16px,3vw,40px)'}}>
          <p style={{fontSize:'11px',fontWeight:700,color:'#0F6E56',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'12px'}}>Keunggulan</p>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'clamp(24px,4vw,38px)',fontWeight:800,marginBottom:'40px'}}>Teknologi Enterprise, Harga Terjangkau</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'20px'}}>
            {[{i:'🤖',t:'Agentic AI Matching',d:'AI memahami konteks, bukan sekadar keyword. Relevansi tinggi, spam rendah.',bg:'#E8F0FB'},
              {i:'⚡',t:'Notifikasi Real-time',d:'Deteksi peluang baru dalam hitungan menit.',bg:'#E1F5EE'},
              {i:'🔍',t:'Multi-Source Crawling',d:'Pantau Ribuan sumber online diindeks secara real-time.',bg:'#FEF3C7'},
              {i:'📱',t:'Multi-Channel Notif',d:'Email, WhatsApp, Telegram, atau Push. Pilih yang nyaman.',bg:'#EDE9FE'},
              {i:'📍',t:'Deteksi Lokasi Otomatis',d:'Lokasi terisi otomatis saat buat Pantau.in.',bg:'#FFE4E6'},
              {i:'✨',t:'Auto-detect Kategori',d:'Tulis bebas — AI langsung deteksi kategorinya.',bg:'#DCFCE7'},
            ].map(f=>(
              <div key={f.t} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'28px'}}>
                <div style={{width:'48px',height:'48px',borderRadius:'12px',background:f.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',marginBottom:'16px'}}>{f.i}</div>
                <h3 style={{fontWeight:700,fontSize:'16px',marginBottom:'8px'}}>{f.t}</h3>
                <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.65,margin:0}}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="cara-kerja" style={{padding:'clamp(40px,6vw,64px) clamp(16px,4vw,40px)'}}>
        <div style={{maxWidth:'1160px',margin:'0 auto',paddingLeft:'clamp(16px,3vw,40px)',paddingRight:'clamp(16px,3vw,40px)',textAlign:'center'}}>
          <p style={{fontSize:'11px',fontWeight:700,color:'#0F6E56',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'12px'}}>Cara Kerja</p>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'clamp(24px,4vw,38px)',fontWeight:800,marginBottom:'48px'}}>Mulai Memantau dalam 3 Menit</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'20px',textAlign:'left'}}>
            {[{n:'01',i:'🎯',t:'Tulis Kata Kunci',d:'Ketik apa yang ingin dipantau — tender, berita industri, pengumuman, atau topik bisnis apapun. AI kami yang pahami konteksnya.'},
              {n:'02',i:'🤖',t:'Sistem Memindai Internet',d:'Pantau.in memindai ribuan sumber online setiap 5 menit — media nasional, media daerah, portal berita industri, dan situs pengumuman publik.'},
              {n:'03',i:'📱',t:'Terima Notifikasi Instan',d:'Begitu ada konten baru yang relevan ditemukan, alert langsung dikirim ke WhatsApp, Email, atau Telegram pilihanmu.'},
            ].map(s=>(
              <div key={s.t} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'32px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:'-8px',right:'16px',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'56px',fontWeight:800,color:'#F0F4F9'}}>{s.n}</div>
                <div style={{fontSize:'40px',marginBottom:'16px'}}>{s.i}</div>
                <h3 style={{fontWeight:700,fontSize:'17px',marginBottom:'10px'}}>{s.t}</h3>
                <p style={{fontSize:'14px',color:'#5A7090',lineHeight:1.7,margin:0}}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{background:'white',padding:'clamp(40px,6vw,64px) clamp(16px,4vw,40px)'}}>
        <div style={{maxWidth:'1160px',margin:'0 auto',paddingLeft:'clamp(16px,3vw,40px)',paddingRight:'clamp(16px,3vw,40px)'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <p style={{fontSize:'11px',fontWeight:700,color:'#0F6E56',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'12px'}}>Harga</p>
            <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'clamp(24px,4vw,38px)',fontWeight:800,marginBottom:'12px'}}>Pilih Plan yang Tepat</h2>
            <p style={{color:'#5A7090',fontSize:'16px',margin:0}}>Mulai gratis, upgrade kapan saja. Tidak ada kontrak.</p>
          </div>
          {/* ROI Calculator */}
          <div id="roi-calculator" style={{background:'linear-gradient(135deg,#F0F7FF,#E8F0FB)',border:'1.5px solid #BDD4F5',borderRadius:'20px',padding:'28px 32px',marginBottom:'40px',maxWidth:'760px',margin:'0 auto 40px'}}>
            <div style={{display:'flex',gap:'10px',alignItems:'flex-start',marginBottom:'20px'}}>
              <span style={{fontSize:'24px'}}>🧮</span>
              <div>
                <h3 style={{fontWeight:800,fontSize:'17px',color:'#0D1B2A',margin:'0 0 4px'}}>Kalkulator ROI — Berapa Nilai Pantau.in untuk Bisnis Kamu?</h3>
                <p style={{fontSize:'13px',color:'#5A7090',margin:0}}>Geser slider untuk hitung balik modal berlangganan Pro</p>
              </div>
            </div>
            <RoiCalculator />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'20px'}}>
            {PLANS.map(p=>(
              <div key={p.key} style={{background:'white',border:`2px solid ${p.popular?'#1560BD':'#DDE5EF'}`,borderRadius:'20px',padding:'32px',position:'relative',boxShadow:p.popular?'0 8px 32px rgba(21,96,189,0.15)':'none'}}>
                {p.popular&&<div style={{position:'absolute',top:'-13px',left:'50%',transform:'translateX(-50%)',background:'#1560BD',color:'white',fontSize:'11px',fontWeight:700,padding:'4px 18px',borderRadius:'100px',whiteSpace:'nowrap'}}>Paling Populer</div>}
                <div style={{fontSize:'11px',fontWeight:700,padding:'3px 12px',borderRadius:'100px',display:'inline-block',marginBottom:'16px',textTransform:'uppercase',background:p.bg,color:p.color}}>{p.name}</div>
                <div style={{marginBottom:'6px'}}><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'40px',fontWeight:800,color:'#0D1B2A'}}>{p.price===0?'Gratis':`Rp ${(p.price/1000).toFixed(0)}K`}</span>{p.price>0&&<span style={{fontSize:'14px',color:'#5A7090'}}>/bln</span>}</div>
                {p.priceYear?<p style={{fontSize:'13px',color:'#5A7090',marginBottom:'24px'}}>atau Rp {(p.priceYear/1000).toFixed(0)}K/tahun <span style={{color:'#0F6E56',fontWeight:600}}>(hemat 20%)</span></p>:<p style={{fontSize:'13px',color:'#5A7090',marginBottom:'24px'}}>Selamanya gratis, tanpa kartu kredit</p>}
                <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'28px'}}>
                  {p.features.map(f=><div key={f} style={{display:'flex',gap:'10px',fontSize:'14px',alignItems:'center'}}><span style={{color:'#0F6E56',fontWeight:700,flexShrink:0}}>✓</span>{f}</div>)}
                  {p.nope.map(f=><div key={f} style={{display:'flex',gap:'10px',fontSize:'14px',color:'#9EB3C8',alignItems:'center'}}><span style={{flexShrink:0}}>—</span>{f}</div>)}
                </div>
                <a href="/register" style={{display:'block',textAlign:'center',padding:'13px',borderRadius:'12px',fontSize:'15px',fontWeight:700,background:p.price===0?'white':p.color,color:p.price===0?'#5A7090':'white',border:p.price===0?'2px solid #DDE5EF':'none'}}>
                  {p.price===0?'Mulai Gratis':`Mulai ${p.name} →`}
                </a>
              </div>
            ))}
          </div>

          {/* FAQ Pricing */}
          <div style={{marginTop:'56px'}}>
            <h3 style={{textAlign:'center',fontSize:'22px',fontWeight:800,marginBottom:'32px'}}>Pertanyaan Umum</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,460px),1fr))',gap:'16px',maxWidth:'960px',margin:'0 auto'}}>
              {[
                ['Apakah kartu kredit wajib untuk daftar?','Tidak. Plan Free tidak butuh kartu kredit sama sekali. Upgrade ke Pro atau Business bisa dilakukan kapan saja via transfer bank, QRIS, GoPay, OVO, atau ShopeePay.'],
                ['Bisa cancel kapan saja?','Ya. Tidak ada kontrak atau komitmen jangka panjang. Kamu bisa berhenti kapan saja, dan akun otomatis kembali ke Free di akhir periode.'],
                ['Apa itu Pantau.in?','Pantau.in adalah kata kunci Pantau.in yang kamu set — misalnya "tender konstruksi Surabaya" atau "ruko Jakarta Selatan di bawah 2M". Setiap kali ada listing baru yang cocok, kamu langsung dapat notifikasi.'],
                ['Berapa lama sampai dapat notifikasi pertama?','Scraper berjalan setiap 5 menit. Setelah kamu buat Pantau.in, notifikasi pertama biasanya datang dalam 5-10 menit jika ada listing yang cocok.'],
                ['Apakah data saya aman?','Ya. Semua data pribadi (nomor HP, WhatsApp) dienkripsi AES-256. Kami tidak pernah menjual data kamu ke pihak ketiga. Pantau.in tunduk pada UU PDP Indonesia.'],
                ['Bisa upgrade/downgrade di tengah periode?','Bisa. Upgrade langsung aktif. Downgrade berlaku di akhir periode billing berjalan.'],
              ].map(([q,a])=>(
                <div key={String(q)} style={{background:'#F8FAFC',borderRadius:'14px',padding:'20px 24px'}}>
                  <p style={{fontWeight:700,fontSize:'14px',marginBottom:'8px',color:'#0D1B2A'}}>{q}</p>
                  <p style={{fontSize:'13px',color:'#5A7090',lineHeight:1.7,margin:0}}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',padding:'88px 40px',textAlign:'center'}}>
        <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'clamp(28px,4vw,42px)',fontWeight:800,color:'white',marginBottom:'16px'}}>Siap Memantau Peluangmu?</h2>
        <p style={{color:'rgba(255,255,255,0.75)',marginBottom:'36px',fontSize:'17px',maxWidth:'480px',margin:'0 auto 36px',lineHeight:1.7}}>Mulai gratis sekarang — tidak perlu kartu kredit, aktif dalam 90 detik.</p>
        <a href="/register" style={{display:'inline-block',background:'white',color:'#1560BD',fontWeight:700,padding:'16px 40px',borderRadius:'12px',fontSize:'16px'}}>Daftar Gratis Sekarang →</a>
      </section>

      {/* FOOTER DINAMIS */}
      <footer style={{background:'#0D1B2A',padding:'64px 40px 28px'}}>
        <div style={{maxWidth:'1160px',margin:'0 auto',paddingLeft:'clamp(16px,3vw,40px)',paddingRight:'clamp(16px,3vw,40px)'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:'40px',marginBottom:'52px'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}><LOGO/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'20px',fontWeight:800}}><span style={{color:'white'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></div>
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',lineHeight:1.8,marginBottom:'24px',maxWidth:'240px'}}>Sistem intelijen peluang berbasis AI — pantau internet Indonesia, terima alert di WhatsApp.</p>
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                <a href={`mailto:${cfg.contact_email}`} style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'rgba(255,255,255,0.6)'}}><span>📧</span><span>{cfg.contact_email}</span></a>
                <a href={cfg.contact_wa} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'rgba(255,255,255,0.6)'}}><span>💬</span><span>WhatsApp Support {cfg.contact_wa_label}</span></a>
                <a href={cfg.telegram_channel} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'rgba(255,255,255,0.6)'}}><span>✈️</span><span>Telegram Channel</span></a>
              </div>
            </div>
            <div>
              <p style={{fontSize:'11px',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'16px'}}>Fitur</p>
              {([['Cara Kerja Pantau.in','/cara-kerja'],['Pantau Keyword Apapun','/fitur/keyword'],['Alert WA & Email','/fitur/notifikasi'],['Keamanan & Privasi','/keamanan'],['Tentang Kami','/about']] as [string,string][]).map(([label,href])=><a key={label} href={href} style={{display:'block',fontSize:'13px',color:'rgba(255,255,255,0.6)',marginBottom:'10px'}}>{label}</a>)}
            </div>
            {[['Harga',safeArr(cfg.footer_harga),'#pricing'],['Developer',safeArr(cfg.footer_developer),'#'],].map(([title,links,def])=>(
              <div key={String(title)}>
                <p style={{fontSize:'11px',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'16px'}}>{title}</p>
                {(links as string[]).map(l=><a key={l} href={String(def)} style={{display:'block',fontSize:'13px',color:'rgba(255,255,255,0.6)',marginBottom:'10px'}}>{l}</a>)}
              </div>
            ))}
            <div>
              <p style={{fontSize:'11px',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'16px'}}>Legal</p>
              {safeArr(cfg.footer_legal).map((l:string)=>{
                const href=legalHref[l]||'#'
                return <a key={l} href={href} style={{display:'block',fontSize:'13px',color:'rgba(255,255,255,0.6)',marginBottom:'10px'}}>{l}</a>
              })}
            </div>
          </div>
          <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
            <p style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',margin:0}}>© 2025 {cfg.site_name}. All rights reserved.</p>
            <p style={{fontSize:'12px',color:'rgba(255,255,255,0.25)',margin:0}}>Pembayaran aman via <strong style={{color:'rgba(255,255,255,0.4)'}}>Midtrans</strong> · PCI DSS Level 1</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
