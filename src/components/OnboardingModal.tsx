'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PROVINCES = [
  'DKI Jakarta','Jawa Barat','Jawa Tengah','Jawa Timur','Banten',
  'Sumatera Utara','Sumatera Selatan','Kalimantan Timur','Sulawesi Selatan',
  'Bali','DIY Yogyakarta','Riau','Lampung','Seluruh Indonesia',
]

const PROFILES = [
  {k:'KONTRAKTOR',i:'🏗️',l:'Kontraktor / Rekanan',d:'Cari tender pemerintah & swasta',cat:'TENDER',
   keyword:(loc:string)=>`tender pengadaan ${loc}`,nameHint:'Pantau Tender Pengadaan',
   tip:'Pilih lokasi di mana tim kamu bisa mobilisasi. Tender luar pulau biasanya butuh biaya mobilisasi tinggi.',
   chips:(loc:string)=>[`tender jalan ${loc}`,`pengadaan IT dinas ${loc}`,`proyek gedung APBD ${loc}`,`tender air bersih PDAM ${loc}`]},
  {k:'PROPERTI',i:'🏠',l:'Agen / Investor Properti',d:'Cari properti & peluang investasi',cat:'PROPERTI',
   keyword:(loc:string)=>`kavling tanah dijual ${loc}`,nameHint:'Pantau Properti',
   tip:'Sertakan tipe properti dan budget untuk hasil yang lebih relevan.',
   chips:(loc:string)=>[`kavling SHM ${loc}`,`ruko dijual ${loc}`,`rumah KPR ${loc}`,`tanah strategis ${loc}`]},
  {k:'KENDARAAN',i:'🚗',l:'Pedagang Kendaraan',d:'Cari unit bekas berkualitas',cat:'KENDARAAN',
   keyword:(loc:string)=>`mobil bekas ${loc}`,nameHint:'Pantau Kendaraan',
   tip:'Tambahkan merk atau tipe kendaraan untuk hasil lebih spesifik.',
   chips:(loc:string)=>[`Avanza bekas ${loc}`,`pickup L300 ${loc}`,`motor matic ${loc}`,`truk box bekas ${loc}`]},
  {k:'BISNIS',i:'💼',l:'Pebisnis / Entrepreneur',d:'Cari peluang bisnis & mitra',cat:'BISNIS',
   keyword:(loc:string)=>`peluang bisnis franchise ${loc}`,nameHint:'Pantau Peluang Bisnis',
   tip:'Sertakan modal atau jenis bisnis yang diminati untuk notif yang lebih tepat.',
   chips:(loc:string)=>[`franchise minuman ${loc}`,`distributor sembako ${loc}`,`mitra UMKM ${loc}`,`agen resmi ${loc}`]},
  {k:'KERJA',i:'👔',l:'Pencari Kerja',d:'Cari lowongan yang relevan',cat:'LOWONGAN',
   keyword:(loc:string)=>`lowongan kerja ${loc}`,nameHint:'Pantau Lowongan',
   tip:'Tambahkan bidang keahlian atau posisi yang dicari untuk hasil terbaik.',
   chips:(loc:string)=>[`programmer ${loc}`,`marketing digital ${loc}`,`akuntan ${loc}`,`remote WFH ${loc}`]},
  {k:'RESELLER',i:'📦',l:'Pedagang / Reseller',d:'Cari produk & supplier terbaik',cat:'BISNIS',
   keyword:(loc:string)=>`supplier grosir ${loc}`,nameHint:'Pantau Supplier',
   tip:'Sebutkan jenis produk yang dicari untuk hasil lebih relevan.',
   chips:(loc:string)=>[`supplier baju distro ${loc}`,`grosir elektronik ${loc}`,`dropship ${loc}`,`agen kosmetik ${loc}`]},
  {k:'INVESTASI',i:'📈',l:'Investor',d:'Pantau peluang investasi',cat:'INVESTASI',
   keyword:(loc:string)=>`peluang investasi properti ${loc}`,nameHint:'Pantau Investasi',
   tip:'Sebutkan jenis investasi (properti, saham, obligasi) untuk notif yang lebih fokus.',
   chips:(loc:string)=>[`investasi properti ${loc}`,`tanah kavling ${loc}`,`obligasi saham`,`reksadana yield tinggi`]},
  {k:'BEASISWA',i:'🎓',l:'Pencari Beasiswa',d:'Cari beasiswa S1/S2 dalam & luar negeri',cat:'BEASISWA',
   keyword:(loc:string)=>`beasiswa ${loc}`,nameHint:'Pantau Beasiswa',
   tip:'Sertakan jenjang pendidikan dan bidang studi untuk hasil yang lebih relevan.',
   chips:(loc:string)=>[`beasiswa S1 ${loc}`,`beasiswa S2 luar negeri`,`LPDP 2025`,`beasiswa kuliah gratis`]},
  {k:'BANTUAN',i:'🤝',l:'Penerima Bantuan',d:'Pantau bantuan & subsidi pemerintah',cat:'BANTUAN',
   keyword:(loc:string)=>`bantuan pemerintah ${loc}`,nameHint:'Pantau Bantuan',
   tip:'Sertakan lokasi untuk bantuan yang tepat sasaran di daerah kamu.',
   chips:(loc:string)=>[`KUR usaha ${loc}`,`BLT subsidi 2025`,`bantuan UMKM ${loc}`,`PKH 2025`]},
  {k:'LAINNYA',i:'🔍',l:'Lainnya',d:'Saya punya kebutuhan spesifik',cat:'BISNIS',
   keyword:(_:string)=>'',nameHint:'Pantauan Saya',tip:'',chips:(_:string)=>[]},
]

const PREVIEW_ITEMS: Record<string,{title:string,src:string,price:string}[]> = {
  TENDER:[
    {title:'Tender Pembangunan Jalan Lingkungan — Dinas PU Kota',src:'LPSE',price:'Rp 1,2 Miliar'},
    {title:'Pengadaan Komputer Dinas Pendidikan — e-Procurement',src:'LPSE',price:'Rp 890 Juta'},
    {title:'Tender Renovasi Gedung Kantor Kecamatan',src:'LPSE',price:'Rp 450 Juta'},
  ],
  PROPERTI:[
    {title:'Tanah Kavling SHM Pinggir Jalan Raya — Lokasi Strategis',src:'OLX Properti',price:'Rp 850 Juta'},
    {title:'Ruko 2 Lantai Siap Pakai — Cocok untuk Usaha',src:'Rumah123',price:'Rp 1,2 Miliar'},
    {title:'Rumah KPR Ready Stock DP 10% — Cicilan Ringan',src:'Lamudi',price:'Rp 420 Juta'},
  ],
  KENDARAAN:[
    {title:'Toyota Avanza G MT 2021 — Km 28.000 Kondisi Mulus',src:'OLX Otomotif',price:'Rp 178 Juta'},
    {title:'Honda Beat Street 2022 — Terawat Plat Kota',src:'OLX Otomotif',price:'Rp 14,5 Juta'},
    {title:'Mitsubishi L300 Pick Up 2019 — Siap Kerja',src:'OLX Otomotif',price:'Rp 95 Juta'},
  ],
  BISNIS:[
    {title:'Franchise Minuman Kekinian Modal Terjangkau — ROI Cepat',src:'Kontan Bisnis',price:'Rp 15 Juta'},
    {title:'Distributor Resmi Wilayah — Terbuka untuk Mitra Baru',src:'Bisnis Indonesia',price:'Hubungi'},
    {title:'Agen Resmi dengan Support & Training Penuh',src:'99.co',price:'Komisi Menarik'},
  ],
  LOWONGAN:[
    {title:'Senior Developer — Remote Full Time, Startup Teknologi',src:'LinkedIn',price:'Rp 15–25 Juta/bln'},
    {title:'Marketing Digital Specialist — WFH Flexible',src:'Glints',price:'Rp 8–12 Juta/bln'},
    {title:'Staff Akuntan — Perusahaan Manufaktur Berkembang',src:'JobStreet',price:'Rp 6–10 Juta/bln'},
  ],
  INVESTASI:[
    {title:'Obligasi Negara Ritel — Yield Kompetitif, Aman',src:'DJPPR Kemenkeu',price:'Min. Rp 1 Juta'},
    {title:'Tanah Kavling Dekat Akses Tol — Harga Developer',src:'Lamudi',price:'Rp 800 Juta'},
    {title:'Reksadana Pendapatan Tetap — Return Konsisten',src:'Bareksa',price:'Min. Rp 10 Ribu'},
  ],
}

interface OnboardingProps {
  userName: string
  onClose: () => void
}

export default function OnboardingModal({ userName, onClose }: OnboardingProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [customLocation, setCustomLocation] = useState('')
  const [queryText, setQueryText] = useState('')
  const [watchName, setWatchName] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const profile = PROFILES.find(p => p.k === selectedProfile)
  const location = customLocation.trim() || selectedLocation || 'Indonesia'
  const isLainnya = selectedProfile === 'LAINNYA'
  const totalSteps = isLainnya ? 3 : 3

  const selectProfile = (pk: string) => {
    const p = PROFILES.find(x => x.k === pk)
    if (!p) return
    setSelectedProfile(pk)
    setSelectedCat(p.cat)
    setWatchName(p.nameHint)
    setStep(1)
  }

  const confirmLocation = () => {
    const p = PROFILES.find(x => x.k === selectedProfile)
    if (!p) return
    const loc = customLocation.trim() || selectedLocation || 'Indonesia'
    setQueryText(p.keyword(loc))
    setStep(2)
  }

  const createWatch = async () => {
    if (!selectedCat || !queryText) return
    setLoading(true)
    try {
      await fetch('/api/watches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: watchName || queryText.slice(0, 50),
          category: selectedCat,
          queryText,
          channels: ['EMAIL'],
          frequency: 'REALTIME',
          filters: {},
        }),
      })
      setDone(true)
      setTimeout(() => { onClose(); router.push('/dashboard/watches') }, 2500)
    } catch { setLoading(false) }
  }

  const overlay: React.CSSProperties = {
    position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',
    zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',
  }
  const modal: React.CSSProperties = {
    background:'white',borderRadius:'20px',width:'100%',maxWidth:'560px',
    maxHeight:'92vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.35)',
  }
  const inp: React.CSSProperties = {
    width:'100%',padding:'12px 14px',border:'1.5px solid #DDE5EF',
    borderRadius:'10px',fontSize:'14px',outline:'none',fontFamily:'inherit',
    background:'white',boxSizing:'border-box',
  }

  const progressPct = step === 0 ? 5 : step === 1 ? 40 : step === 2 ? 75 : 100

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',borderRadius:'20px 20px 0 0',padding:'24px 28px',color:'white'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
            <span style={{fontSize:'13px',opacity:0.7}}>
              {step === 0 ? 'Setup awal' : `Langkah ${step} dari ${totalSteps}`}
            </span>
            <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'13px'}}>Lewati</button>
          </div>
          <div style={{background:'rgba(255,255,255,0.2)',borderRadius:'100px',height:'4px',marginBottom:'16px'}}>
            <div style={{background:'white',borderRadius:'100px',height:'4px',width:`${progressPct}%`,transition:'width .3s'}}/>
          </div>
          <h2 style={{fontWeight:800,fontSize:'20px',margin:'0 0 4px'}}>
            {step === 0 && `Hei ${userName}! 👋 Kamu seorang...`}
            {step === 1 && '📍 Kamu beroperasi di mana?'}
            {step === 2 && !isLainnya && '🎯 Konfirmasi keyword pantauan'}
            {step === 2 && isLainnya && '🔍 Apa yang ingin dipantau?'}
          </h2>
          <p style={{opacity:0.8,fontSize:'13px',margin:0}}>
            {step === 0 && 'Pilih profil — keyword & lokasi pantauan otomatis terisi'}
            {step === 1 && 'Lokasi membantu kami filter peluang yang benar-benar relevan'}
            {step === 2 && !isLainnya && 'Keyword sudah terisi otomatis — ubah jika perlu'}
            {step === 2 && isLainnya && 'Tulis dalam bahasa natural — AI kami akan memahaminya'}
          </p>
        </div>

        {/* Body */}
        <div style={{padding:'24px 28px'}}>

          {/* Step 0 — Pilih profil */}
          {step === 0 && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,240px),1fr))',gap:'10px'}}>
              {PROFILES.map(p => (
                <button key={p.k} onClick={() => selectProfile(p.k)} type="button"
                  style={{padding:'14px 16px',border:'2px solid #DDE5EF',borderRadius:'14px',background:'white',
                    cursor:'pointer',textAlign:'left',transition:'all .15s',display:'flex',gap:'12px',alignItems:'center'}}>
                  <span style={{fontSize:'28px',flexShrink:0}}>{p.i}</span>
                  <div>
                    <p style={{fontWeight:700,fontSize:'13px',margin:'0 0 2px',color:'#0D1B2A'}}>{p.l}</p>
                    <p style={{fontSize:'11px',color:'#9EB3C8',margin:0}}>{p.d}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1 — Pilih Lokasi */}
          {step === 1 && (
            <div style={{display:'grid',gap:'16px'}}>
              <div style={{background:'#E1F5EE',borderRadius:'12px',padding:'14px 16px',display:'flex',gap:'12px',alignItems:'center'}}>
                <span style={{fontSize:'24px'}}>{profile?.i}</span>
                <div>
                  <p style={{fontWeight:700,fontSize:'13px',color:'#0F6E56',margin:'0 0 2px'}}>Profil: {profile?.l}</p>
                  <p style={{fontSize:'12px',color:'#5A7090',margin:0}}>Pilih lokasi operasional kamu</p>
                </div>
              </div>

              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>Pilih provinsi / wilayah</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {PROVINCES.map(prov => (
                    <button key={prov} onClick={() => setSelectedLocation(prov)} type="button"
                      style={{padding:'8px 14px',border:`1.5px solid ${selectedLocation===prov?'#1560BD':'#DDE5EF'}`,
                        borderRadius:'10px',background:selectedLocation===prov?'#E8F0FB':'white',
                        cursor:'pointer',fontSize:'13px',color:selectedLocation===prov?'#1560BD':'#5A7090',
                        fontWeight:selectedLocation===prov?700:400,textAlign:'center',transition:'all .15s'}}>
                      {prov}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>
                  Atau tulis kota spesifik <span style={{fontWeight:400,color:'#9EB3C8'}}>(opsional)</span>
                </label>
                <input value={customLocation} onChange={e=>setCustomLocation(e.target.value)}
                  placeholder="Contoh: Bekasi, Tangerang Selatan, Surabaya..."
                  style={inp}/>
                <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'4px'}}>💡 Makin spesifik lokasi, makin relevan notifikasi yang kamu dapat</p>
              </div>

              {profile?.tip && (
                <div style={{background:'#FFF8E1',border:'1px solid #FFD54F',borderRadius:'12px',padding:'12px 14px',display:'flex',gap:'10px'}}>
                  <span style={{fontSize:'18px',flexShrink:0}}>⚡</span>
                  <div>
                    <p style={{fontWeight:700,fontSize:'13px',color:'#856404',margin:'0 0 2px'}}>Tips untuk {profile.l}</p>
                    <p style={{fontSize:'12px',color:'#856404',margin:0}}>{profile.tip}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Keyword */}
          {step === 2 && !done && (
            <div style={{display:'grid',gap:'16px'}}>
              {(selectedLocation || customLocation) && (
                <div style={{background:'#E1F5EE',borderRadius:'10px',padding:'10px 14px',display:'flex',gap:'8px',alignItems:'center'}}>
                  <span>📍</span>
                  <p style={{fontSize:'13px',fontWeight:600,color:'#0F6E56',margin:0}}>
                    Lokasi: {customLocation.trim() || selectedLocation} — sudah ditambahkan ke keyword
                  </p>
                </div>
              )}

              {!isLainnya && profile && (
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>💡 Pilih atau tulis sendiri</label>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'10px'}}>
                    {profile.chips(location).map(kw => (
                      <button key={kw} onClick={() => setQueryText(kw)} type="button"
                        style={{fontSize:'12px',padding:'5px 12px',borderRadius:'100px',
                          border:`1px solid ${queryText===kw?'#1560BD':'#DDE5EF'}`,
                          background:queryText===kw?'#E8F0FB':'#F8FAFC',
                          color:queryText===kw?'#1560BD':'#5A7090',
                          cursor:'pointer',fontWeight:queryText===kw?700:400}}>
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>
                  {isLainnya ? 'Apa yang ingin dipantau? *' : 'Ubah keyword (opsional)'}
                </label>
                <textarea value={queryText} onChange={e=>setQueryText(e.target.value)}
                  placeholder={isLainnya ? 'Contoh: tender jalan Jawa Tengah, beasiswa S2 dalam negeri...' : ''}
                  rows={3} style={{...inp,resize:'none'}}/>
              </div>

              {/* Tips menulis keyword */}
              <div style={{background:'#F8FAFC',border:'1px solid #DDE5EF',borderRadius:'12px',padding:'14px 16px'}}>
                <p style={{fontWeight:700,fontSize:'12px',color:'#5A7090',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>✏️ Tips keyword yang bagus</p>
                <div style={{display:'grid',gap:'6px'}}>
                  <div style={{display:'flex',gap:'8px'}}>
                    <span style={{color:'#0F6E56',fontWeight:700,fontSize:'12px',flexShrink:0}}>✓</span>
                    <span style={{fontSize:'12px',color:'#5A7090'}}><strong style={{color:'#0D1B2A'}}>Spesifik:</strong> "tender jalan aspal Jakarta Selatan 2025"</span>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <span style={{color:'#0F6E56',fontWeight:700,fontSize:'12px',flexShrink:0}}>✓</span>
                    <span style={{fontSize:'12px',color:'#5A7090'}}><strong style={{color:'#0D1B2A'}}>Ada lokasi:</strong> "kavling SHM Depok pinggir jalan"</span>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <span style={{color:'#EF4444',fontWeight:700,fontSize:'12px',flexShrink:0}}>✗</span>
                    <span style={{fontSize:'12px',color:'#9EB3C8'}}><strong>Terlalu umum:</strong> "properti" atau "tender" (terlalu banyak hasil tidak relevan)</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>Nama pantauan <span style={{fontWeight:400,color:'#9EB3C8'}}>(opsional)</span></label>
                <input value={watchName} onChange={e=>setWatchName(e.target.value)}
                  placeholder={profile?.nameHint ?? 'Pantauan Saya'} style={inp}/>
              </div>
            </div>
          )}

          {/* Done */}
          {done && (
            <div style={{display:'grid',gap:'16px'}}>
              <div style={{textAlign:'center',paddingTop:'8px'}}>
                <div style={{fontSize:'48px',marginBottom:'8px'}}>🎉</div>
                <h3 style={{fontWeight:800,color:'#0D1B2A',marginBottom:'4px',fontSize:'17px'}}>Pantauan berhasil dibuat!</h3>
                <p style={{color:'#5A7090',fontSize:'13px'}}>Ini contoh peluang yang akan kamu terima:</p>
              </div>
              <div style={{display:'grid',gap:'8px'}}>
                {(PREVIEW_ITEMS[selectedCat] ?? PREVIEW_ITEMS['BISNIS']).map((item,i) => (
                  <div key={i} style={{background:'#F8FAFC',border:'1px solid #DDE5EF',borderRadius:'12px',padding:'12px 14px',display:'flex',gap:'12px',alignItems:'flex-start'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#0F6E56',marginTop:'5px',flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'13px',fontWeight:600,color:'#0D1B2A',margin:'0 0 3px',lineHeight:1.4}}>{item.title}</p>
                      <p style={{fontSize:'11px',color:'#9EB3C8',margin:0}}>{item.src} · <span style={{color:'#0F6E56',fontWeight:700}}>{item.price}</span></p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{background:'#E8F0FB',borderRadius:'10px',padding:'12px 14px',display:'flex',gap:'8px',alignItems:'center'}}>
                <span style={{fontSize:'16px'}}>⚡</span>
                <p style={{fontSize:'12px',color:'#1560BD',margin:0,fontWeight:600}}>Notifikasi real dari sistem akan tiba dalam ~5 menit. Mengalihkan ke dashboard...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && step > 0 && (
          <div style={{padding:'0 28px 24px',display:'flex',gap:'10px',justifyContent:'space-between',alignItems:'center'}}>
            <button onClick={() => setStep(step-1)}
              style={{padding:'11px 20px',border:'1px solid #DDE5EF',borderRadius:'10px',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600,color:'#5A7090'}}>
              ← Kembali
            </button>
            <div style={{display:'flex',gap:'10px'}}>
              {step === 1 && (
                <button onClick={confirmLocation} disabled={!selectedLocation && !customLocation.trim()}
                  style={{padding:'11px 24px',
                    background:(!selectedLocation && !customLocation.trim())?'#DDE5EF':'#1560BD',
                    color:(!selectedLocation && !customLocation.trim())?'#9EB3C8':'white',
                    border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  Lanjut →
                </button>
              )}
              {step === 2 && (
                <button onClick={createWatch} disabled={loading || !queryText}
                  style={{padding:'11px 24px',background:(loading||!queryText)?'#DDE5EF':'#0F6E56',
                    color:(loading||!queryText)?'#9EB3C8':'white',border:'none',borderRadius:'10px',
                    fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  {loading ? '⏳ Membuat...' : '🚀 Mulai Pantau Sekarang'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
