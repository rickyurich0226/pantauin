'use client'
import { useState, useEffect } from 'react'
import NearMissModal from '@/components/NearMissModal'
import { useSession } from 'next-auth/react'
import { FileText, Home, Car, Briefcase, TrendingUp, Users, GraduationCap, HeartHandshake, Mail, MessageCircle, Send, Bell, Search } from 'lucide-react'
// Daftar kategori HARUS persis sama dengan enum di src/lib/validation.ts
// (watchQuerySchema.category) dan VALID_CATEGORIES di matching.ts / API publik.
// Jangan tambah/ubah key di sini tanpa mengubah semuanya secara bersamaan.
const CATS = [
  {k:'TENDER',l:'Tender & Pengadaan',i:'📋',icon:FileText},{k:'PROPERTI',l:'Properti',i:'🏠',icon:Home},
  {k:'KENDARAAN',l:'Kendaraan',i:'🚗',icon:Car},{k:'BISNIS',l:'Peluang Bisnis',i:'💼',icon:Briefcase},
  {k:'INVESTASI',l:'Investasi',i:'📈',icon:TrendingUp},{k:'LOWONGAN',l:'Lowongan Kerja',i:'👔',icon:Users},
  {k:'BEASISWA',l:'Beasiswa',i:'🎓',icon:GraduationCap},{k:'BANTUAN',l:'Bantuan & Subsidi',i:'🤝',icon:HeartHandshake},
]
const CHANNELS = [
  {k:'EMAIL',i:'📧',l:'Email',free:true,icon:Mail},
  {k:'WHATSAPP',i:'💬',l:'WhatsApp',free:false,icon:MessageCircle},
  {k:'TELEGRAM',i:'✈️',l:'Telegram',free:false,icon:Send},
  {k:'PUSH',i:'🔔',l:'Push Notif',free:false,icon:Bell},
]
export default function WatchesPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isPro = user?.plan !== 'FREE'
  const [watches, setWatches] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['EMAIL'])
  const [form, setForm] = useState({name:'',category:'TENDER',queryText:'',location:'',priceMin:'',priceMax:'',mustInclude:'',exclude:'',frequency:'REALTIME'})
  const [watchStats, setWatchStats] = useState<any>({stats:{},healthySources:0,totalSources:0})
  const [editWatch, setEditWatch] = useState<any>(null)
  const [editForm, setEditForm] = useState({name:'',queryText:'',location:'',priceMin:'',priceMax:'',mustInclude:'',exclude:'',frequency:'REALTIME'})
  const [editLoading, setEditLoading] = useState(false)
  const [showNearMiss, setShowNearMiss] = useState(false)
  const [nearMissItems, setNearMissItems] = useState<any[]>([])
  const [preview, setPreview] = useState<{count:number,items:any[],keywords:string[]}|null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:'ok'|'err'}|null>(null)
  const showToast = (msg:string,type:'ok'|'err'='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),3500)}
  const [confirmBroad, setConfirmBroad] = useState(false)

  useEffect(()=>{
    fetch('/api/watches').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setWatches(d) })
    fetch('/api/watches/stats').then(r=>r.json()).then(d=>{ if(d.stats) setWatchStats(d) })
  },[])

  const toggleChannel = (k:string, free:boolean) => {
    if (!free && !isPro) { showToast('Channel ini tersedia di plan Pro. Upgrade dulu!','err'); return }
    setSelectedChannels(prev => prev.includes(k) ? (prev.length>1?prev.filter(c=>c!==k):prev) : [...prev,k])
  }

  const handleAddWatch = async () => {
    if (!isPro && watches.length >= 3) {
      // Fetch sample items yang akan terlewat
      try {
        const res = await fetch('/api/watches/near-miss')
        if (res.ok) {
          const data = await res.json()
          setNearMissItems(data.items ?? [])
        }
      } catch {}
      setShowNearMiss(true)
      return
    }
    setShowForm(true)
  }

  const checkPreview = async () => {
    if (!form.queryText || !form.category) return
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/watches/preview', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({queryText: form.queryText, category: form.category})
      })
      const data = await res.json()
      setPreview(data)
    } catch {}
    setPreviewLoading(false)
  }

  const NON_LOCATION_TERMS = ['hrd','marketing','akuntan','programmer','admin','sales','kasir','driver',
    'murah','terbaik','strategis','baru','bekas','modal','usaha','franchise','distributor','agen',
    'developer','designer','manager','staff','supervisor','operator','teknisi','engineer']
  const validateLocation = (loc: string): string | null => {
    if (!loc.trim()) return null
    const parts = loc.toLowerCase().split(',').map(p => p.trim()).filter(Boolean)
    const badPart = parts.find(p => NON_LOCATION_TERMS.includes(p))
    if (badPart) return `"${badPart}" sepertinya bukan nama lokasi. Kolom Lokasi hanya untuk nama kota/daerah, mis. "Depok, Jawa Barat".`
    return null
  }
  const submit = async () => {
    if (!form.name||!form.queryText) return showToast('Nama dan deskripsi wajib diisi','err')
    const locError = validateLocation(form.location)
    if (locError) return showToast(locError,'err')
    // WAJIB cek preview sebelum submit (bukan cuma pas blur) — supaya kasus
    // seperti keyword multi-topik ("saham investasi usaha franchise") yang lolos
    // dari nudge analyzeQuery tetap tertangkap lewat angka match real dari DB.
    if (!confirmBroad) {
      setPreviewLoading(true)
      try {
        const res = await fetch('/api/watches/preview', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({queryText: form.queryText, category: form.category})
        })
        const data = await res.json()
        setPreview(data)
        if (data.count > 200) {
          setPreviewLoading(false)
          setConfirmBroad(true)
          showToast(`⚠️ Ditemukan ~${data.count} artikel cocok — keyword kemungkinan terlalu luas. Klik "Simpan" sekali lagi kalau tetap ingin lanjut.`,'err')
          return
        }
      } catch {}
      setPreviewLoading(false)
    }
    setLoading(true)
    const res = await fetch('/api/watches',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...form,channels:selectedChannels,filters:{location:form.location||undefined,
        priceMin:form.priceMin?Number(form.priceMin):undefined,priceMax:form.priceMax?Number(form.priceMax):undefined,
        mustInclude:form.mustInclude||undefined,exclude:form.exclude||undefined}})})
    const data = await res.json()
    if(res.ok){setWatches([data,...watches]);setShowForm(false);setForm({name:'',category:'TENDER',queryText:'',location:'',priceMin:'',priceMax:'',mustInclude:'',exclude:'',frequency:'REALTIME'});setSelectedChannels(['EMAIL']);setPreview(null);setConfirmBroad(false)}
    else showToast(data.error||'Gagal membuat pantauan','err')
    setLoading(false)
  }

  const openEdit = (w:any) => {
    setEditWatch(w)
    setEditForm({name:w.name,queryText:w.queryText,location:w.filters?.location||'',priceMin:w.filters?.priceMin||'',priceMax:w.filters?.priceMax||'',mustInclude:w.filters?.mustInclude||'',exclude:w.filters?.exclude||'',frequency:w.frequency??'REALTIME'})
  }

  const submitEdit = async () => {
    setEditLoading(true)
    const res = await fetch('/api/watches',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:editWatch.id,name:editForm.name,queryText:editForm.queryText,frequency:editForm.frequency,
        filters:{location:editForm.location||undefined,priceMin:editForm.priceMin?Number(editForm.priceMin):undefined,
          priceMax:editForm.priceMax?Number(editForm.priceMax):undefined,mustInclude:editForm.mustInclude||undefined,exclude:editForm.exclude||undefined}})})
    if(res.ok){const d=await res.json();setWatches(watches.map(w=>w.id===d.id?d:w));setEditWatch(null)}
    else showToast('Gagal menyimpan','err')
    setEditLoading(false)
  }

  const del = async(id:string)=>{
    if(!confirm('Hapus pantauan ini?'))return
    await fetch('/api/watches',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setWatches(watches.filter(w=>w.id!==id))
  }

  const testNotif = async(watchId:string,watchName:string)=>{
    if(!confirm('Kirim test notifikasi untuk "'+watchName+'"?')) return
    const res = await fetch('/api/notifications/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({watchId})})
    const data = await res.json()
    if(res.ok) showToast('Test notifikasi berhasil dikirim! Cek email kamu.','ok')
    else showToast('Gagal: ' + (data.error || 'Coba lagi'),'err')
  }

  const inp:React.CSSProperties = {width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'8px',fontSize:'14px',outline:'none',fontFamily:'inherit',background:'white',boxSizing:'border-box'}

  const KNOWN_CITIES = ['jakarta','bandung','surabaya','medan','semarang','makassar','palembang',
    'tangerang','depok','bekasi','bogor','malang','yogyakarta','jogja','solo','denpasar','bali',
    'balikpapan','samarinda','pekanbaru','batam','padang','manado','pontianak','banjarmasin',
    'jambi','mataram','kupang','ambon','jayapura','palu','ternate','sorong','kendari','gorontalo',
    'karawang','cikarang','cirebon','sukabumi','tasikmalaya','purwokerto','kediri','madiun',
    'sidoarjo','gresik','jember','banyuwangi','lampung','palangkaraya','bengkulu']
  const analyzeQuery = (text:string, location?:string) => {
    const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return null
    const seen = new Set<string>()
    let duplicates = 0
    for (const w of words) {
      if (w.length > 2) { if (seen.has(w)) duplicates++; seen.add(w) }
    }
    if (words.length > 14 || duplicates >= 2) {
      return { level:'warn', msg:'⚠️ Kata kunci ini terlalu panjang/luas. Fokus ke 1 kebutuhan spesifik (jenis, lokasi, budget) agar notifikasi lebih relevan dan tidak membanjiri kamu.' }
    }
    const textLower = text.toLowerCase()
    const mentionedCity = KNOWN_CITIES.find(c => textLower.includes(c))
    if (mentionedCity && !location?.trim()) {
      return { level:'warn', msg:`📍 Kamu sebut "${mentionedCity}" di deskripsi. Isi juga kolom Lokasi di bawah biar sistem cuma kirim hasil dari kota itu — tanpa ini, hasil dari kota lain bisa ikut nyangkut.` }
    }
    if (words.length > 9) {
      return { level:'info', msg:'💡 Cukup detail. Makin spesifik, makin akurat notifikasinya.' }
    }
    return { level:'ok', msg:'✓ Panjang kata kunci bagus.' }
  }

  const ModalForm = ({onClose}:{onClose:()=>void}) => (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-sheet">
        <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',padding:'20px 24px',borderRadius:'20px 20px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',margin:'0 0 2px'}}>Pantau.in</p>
            <h3 style={{fontWeight:800,fontSize:'18px',color:'white',margin:0}}>Buat Pantauan Baru</h3>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:'10px',width:'36px',height:'36px',cursor:'pointer',fontSize:'18px'}}>x</button>
        </div>
        <div style={{padding:'20px 24px',display:'grid',gap:'14px',overflowY:'auto',maxHeight:'70vh'}}>
          <div>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Nama Pantauan *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Tanah Depok Murah" style={inp}/>
          </div>
          <div>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Kategori</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>
              {CATS.map(c=><option key={c.k} value={c.k}>{c.i} {c.l}</option>)}
            </select>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
              <label style={{fontSize:'13px',fontWeight:600}}>Deskripsi Pencarian *</label>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap',justifyContent:'flex-end'}}>
                {({
                  TENDER:['tender konstruksi','pengadaan IT','lelang aset'],
                  PROPERTI:['rumah dijual SHM','tanah kavling murah','ruko strategis'],
                  KENDARAAN:['mobil bekas murah','motor matic 2020'],
                  BISNIS:['franchise modal kecil','bisnis dijual omset'],
                  INVESTASI:['saham rekomendasi beli','properti return tinggi'],
                  LOWONGAN:['fresh graduate IT','remote WFH marketing'],
                  BEASISWA:['beasiswa S2 dalam negeri','beasiswa penuh 2026'],
                  BANTUAN:['bantuan UMKM modal','program subsidi dana hibah'],
                } as Record<string,string[]>)[form.category]?.map((t:string)=>(
                  <button key={t} type="button" onClick={()=>{setForm({...form,queryText:t});setConfirmBroad(false);setTimeout(()=>checkPreview(),100)}}
                    style={{fontSize:'10px',padding:'2px 8px',borderRadius:'100px',border:'1px solid #DDE5EF',background:'#F8FAFC',cursor:'pointer',color:'#5A7090',whiteSpace:'nowrap'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <input value={form.queryText} onChange={e=>{setForm({...form,queryText:e.target.value});setConfirmBroad(false)}} onBlur={checkPreview} placeholder="Contoh: tanah 500m di Depok maks Rp 1 miliar" style={inp}/>
            {(() => {
              const a = analyzeQuery(form.queryText, form.location)
              if (!a) return <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'4px'}}>Tulis seperti menjelaskan ke teman. Contoh: "tanah kavling siap bangun Depok di bawah 500 juta".</p>
              const color = a.level==='warn' ? '#EF4444' : a.level==='info' ? '#B45309' : '#0F6E56'
              return <p style={{fontSize:'12px',color,marginTop:'4px',fontWeight:a.level==='warn'?600:400}}>{a.msg}</p>
            })()}
            {previewLoading && <div style={{background:'#F8FAFC',borderRadius:'10px',padding:'12px',marginTop:'8px'}}><p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>⏳ Mengecek artikel yang cocok...</p></div>}
            {!previewLoading && preview && (
              <div style={{marginTop:'8px',borderRadius:'10px',overflow:'hidden',border:'1px solid #DDE5EF'}}>
                <div style={{padding:'10px 14px',background:preview.count>200?'#FEF2F2':preview.count>0?'#F0FDF4':'#F8FAFC',borderBottom:preview.items?.length>0?'1px solid #DDE5EF':'none'}}>
                  <p style={{fontSize:'12px',margin:0,fontWeight:600,color:preview.count>200?'#DC2626':preview.count>0?'#0F6E56':'#9EB3C8'}}>
                    {preview.count>200
                      ? `⚠️ ~${preview.count} artikel cocok — terlalu luas, persempit kata kunci`
                      : preview.count>0
                        ? `✅ ~${preview.count} artikel cocok ditemukan`
                        : `❌ Belum ada artikel cocok — coba kata kunci lain`}
                  </p>
                </div>
                {preview.items?.length>0 && (
                  <div style={{background:'white'}}>
                    <p style={{fontSize:'11px',fontWeight:600,color:'#9EB3C8',padding:'8px 14px 4px',margin:0,textTransform:'uppercase',letterSpacing:'0.05em'}}>Contoh artikel yang akan dipantau:</p>
                    {preview.items.slice(0,3).map((item:any,i:number)=>(
                      <div key={i} style={{padding:'8px 14px',borderTop:'1px solid #F1F5F9',display:'flex',alignItems:'flex-start',gap:'8px'}}>
                        <span style={{fontSize:'11px',color:'#10B981',flexShrink:0,marginTop:'2px'}}>●</span>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'#0D1B2A',textDecoration:'none',lineHeight:1.4,display:'block'}}>
                          {item.title?.slice(0,80)}{item.title?.length>80?'...':''}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Lokasi</label>
            <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Contoh: Depok, Jawa Barat" style={inp}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Min (Rp)</label>
              <input type="number" value={form.priceMin} onChange={e=>setForm({...form,priceMin:e.target.value})} placeholder="0" style={inp}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Max (Rp)</label>
              <input type="number" value={form.priceMax} onChange={e=>setForm({...form,priceMax:e.target.value})} placeholder="Tak terbatas" style={inp}/>
            </div>
          </div>
          {isPro && (
            <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px',display:'grid',gap:'12px'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#0D1B2A',margin:0}}>Filter Lanjutan (Pro)</p>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Wajib Ada (AND)</label>
                <input value={form.mustInclude} onChange={e=>setForm({...form,mustInclude:e.target.value})} placeholder="pisah koma: SHM, hook jalan" style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Kecualikan (NOT)</label>
                <input value={form.exclude} onChange={e=>setForm({...form,exclude:e.target.value})} placeholder="pisah koma: rusak, banjir" style={inp}/>
              </div>
            </div>
          )}
          <div>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>Kirim Notifikasi ke</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              {CHANNELS.map(ch=>{
                const sel=selectedChannels.includes(ch.k)
                const locked=!ch.free&&!isPro
                return (
                  <button key={ch.k} type="button" onClick={()=>toggleChannel(ch.k,ch.free)}
                    style={{padding:'10px 12px',border:'2px solid '+(sel?'#1560BD':'#DDE5EF'),borderRadius:'10px',
                      background:sel?'#E8F0FB':'white',cursor:'pointer',fontSize:'13px',fontWeight:600,
                      textAlign:'left',opacity:locked?0.6:1,display:'flex',alignItems:'center',gap:'6px'}}>
                    <ch.icon size={16}/><span>{ch.l}</span>
                    {locked && <span style={{fontSize:'10px',background:'#E8F0FB',color:'#1560BD',padding:'1px 6px',borderRadius:'100px',marginLeft:'auto'}}>Pro</span>}
                    {sel && !locked && <span style={{color:'#0F6E56',marginLeft:'auto'}}>v</span>}
                  </button>
                )
              })}
            </div>
          </div>
          {isPro && (
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Frekuensi</label>
              <select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} style={inp}>
                <option value="REALTIME">Real-time</option>
                <option value="HOURLY">Setiap Jam</option>
                <option value="DAILY">Digest Harian</option>
              </select>
            </div>
          )}
          <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px'}}>
            <button onClick={onClose} style={{padding:'10px 20px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px'}}>Batal</button>
            <button onClick={submit} disabled={loading} style={{padding:'10px 20px',background:'#1560BD',color:'white',border:'none',borderRadius:'8px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
              {loading?'Menyimpan...':'Buat Pantauan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const EditModal = ({onClose}:{onClose:()=>void}) => (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-sheet">
        <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',padding:'20px 24px',borderRadius:'20px 20px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',margin:'0 0 2px'}}>Edit</p>
            <h3 style={{fontWeight:800,fontSize:'18px',color:'white',margin:0}}>Edit Pantauan</h3>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:'10px',width:'36px',height:'36px',cursor:'pointer',fontSize:'18px'}}>x</button>
        </div>
        <div style={{padding:'20px 24px',display:'grid',gap:'14px',overflowY:'auto',maxHeight:'70vh'}}>
          <div>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Nama Pantauan *</label>
            <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inp}/>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
              <label style={{fontSize:'13px',fontWeight:600}}>Deskripsi Pencarian *</label>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap',justifyContent:'flex-end'}}>
                {({
                  TENDER:['tender konstruksi','pengadaan IT','lelang aset'],
                  PROPERTI:['rumah dijual SHM','tanah kavling murah','ruko strategis'],
                  KENDARAAN:['mobil bekas murah','motor matic 2020'],
                  BISNIS:['franchise modal kecil','bisnis dijual omset'],
                  INVESTASI:['saham rekomendasi beli','properti return tinggi'],
                  LOWONGAN:['fresh graduate IT','remote WFH marketing'],
                  BEASISWA:['beasiswa S2 dalam negeri','beasiswa penuh 2026'],
                  BANTUAN:['bantuan UMKM modal','program subsidi dana hibah'],
                } as Record<string,string[]>)[form.category]?.map((t:string)=>(
                  <button key={t} type="button" onClick={()=>{setForm({...form,queryText:t});setConfirmBroad(false);setTimeout(()=>checkPreview(),100)}}
                    style={{fontSize:'10px',padding:'2px 8px',borderRadius:'100px',border:'1px solid #DDE5EF',background:'#F8FAFC',cursor:'pointer',color:'#5A7090',whiteSpace:'nowrap'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <input value={editForm.queryText} onChange={e=>setEditForm({...editForm,queryText:e.target.value})} style={inp}/>
          </div>
          <div>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Lokasi</label>
            <input value={editForm.location} onChange={e=>setEditForm({...editForm,location:e.target.value})} style={inp}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Min (Rp)</label>
              <input type="number" value={editForm.priceMin} onChange={e=>setEditForm({...editForm,priceMin:e.target.value})} style={inp}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Max (Rp)</label>
              <input type="number" value={editForm.priceMax} onChange={e=>setEditForm({...editForm,priceMax:e.target.value})} style={inp}/>
            </div>
          </div>
          {isPro && (
            <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px',display:'grid',gap:'12px'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#0D1B2A',margin:0}}>Filter Lanjutan (Pro)</p>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Wajib Ada (AND)</label>
                <input value={editForm.mustInclude} onChange={e=>setEditForm({...editForm,mustInclude:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Kecualikan (NOT)</label>
                <input value={editForm.exclude} onChange={e=>setEditForm({...editForm,exclude:e.target.value})} style={inp}/>
              </div>
            </div>
          )}
          {isPro && (
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Frekuensi</label>
              <select value={editForm.frequency} onChange={e=>setEditForm({...editForm,frequency:e.target.value})} style={inp}>
                <option value="REALTIME">Real-time</option>
                <option value="HOURLY">Setiap Jam</option>
                <option value="DAILY">Digest Harian</option>
              </select>
            </div>
          )}
          <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px'}}>
            <button onClick={onClose} style={{padding:'10px 20px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px'}}>Batal</button>
            <button onClick={submitEdit} disabled={editLoading} style={{padding:'10px 20px',background:'#1560BD',color:'white',border:'none',borderRadius:'8px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
              {editLoading?'Menyimpan...':'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:800}}>Pantau.in</h1>
          <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>{isPro ? watches.length+' pantauan aktif' : watches.length+'/3 digunakan (Plan Gratis)'}</p>
        </div>
        <button onClick={handleAddWatch} style={{background:'#1560BD',color:'white',border:'none',borderRadius:'10px',padding:'10px 20px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
          + Tambah Pantauan
        </button>
      </div>

      {!isPro && (
        <div style={{background:'linear-gradient(135deg,#1560BD,#0F6E56)',borderRadius:'14px',padding:'20px 24px',marginBottom:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',flexWrap:'wrap'}}>
          <div>
            <p style={{color:'white',fontWeight:700,marginBottom:'4px'}}>Upgrade ke Pro - Rp 49.000/bln</p>
            <p style={{color:'rgba(255,255,255,0.8)',fontSize:'13px'}}>Unlimited queries, real-time, WA + Telegram + Email</p>
          </div>
          <a href="/dashboard/upgrade" style={{background:'white',color:'#1560BD',fontWeight:700,padding:'10px 20px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>Upgrade</a>
        </div>
      )}

      {showForm && ModalForm({onClose:()=>setShowForm(false)})}
      {editWatch && EditModal({onClose:()=>setEditWatch(null)})}

      {watchStats.totalSources > 0 && (
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'14px 18px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',flex:1}}>
            <div style={{width:'10px',height:'10px',borderRadius:'50%',background:watchStats.healthySources===watchStats.totalSources?'#10B981':'#F59E0B',flexShrink:0}}/>
            <span style={{fontSize:'13px',fontWeight:600}}>{watchStats.healthySources}/{watchStats.totalSources} sumber aktif</span>
          </div>
          <span style={{fontSize:'12px',color:'#9EB3C8'}}>Update setiap 15 menit</span>
        </div>
      )}

      {watches.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'#9EB3C8'}}>
          <div style={{marginBottom:'16px',display:'flex',justifyContent:'center'}}><Search size={44} color="#DDE5EF"/></div>
          <p style={{fontSize:'18px',fontWeight:700,color:'#5A7090',marginBottom:'8px'}}>Belum ada pantauan</p>
          <p style={{fontSize:'14px',marginBottom:'24px'}}>Tambah pantauan pertama dan mulai terima notifikasi peluang!</p>
          <button onClick={()=>setShowForm(true)} style={{background:'#1560BD',color:'white',border:'none',borderRadius:'10px',padding:'12px 24px',fontWeight:700,cursor:'pointer',fontSize:'15px'}}>+ Tambah Pantauan Pertama</button>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,300px),1fr))',gap:'16px'}}>
          {watches.map(w=>(
            <div key={w.id} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px',display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:'11px',background:'#E8F0FB',color:'#1560BD',padding:'2px 8px',borderRadius:'100px',fontWeight:600,display:'inline-block',marginBottom:'6px'}}>
                    {(()=>{const CI=CATS.find(c=>c.k===w.category)?.icon; return CI?<CI size={12} style={{display:'inline',verticalAlign:'-2px',marginRight:'2px'}}/>:null})()}{CATS.find(c=>c.k===w.category)?.l||w.category}
                  </span>
                  <h3 style={{fontSize:'16px',fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.name}</h3>
                  <p style={{fontSize:'13px',color:'#5A7090',margin:'4px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>"{w.queryText}"</p>
                </div>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#10B981',flexShrink:0,marginTop:'4px'}}/>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {(w.channels||['EMAIL']).map((ch:string)=>(
                  <span key={ch} style={{fontSize:'11px',background:'#F0F4F9',color:'#5A7090',padding:'2px 8px',borderRadius:'100px',fontWeight:600}}>
                    {(()=>{const CI=CHANNELS.find(c=>c.k===ch)?.icon; return CI?<CI size={11} style={{display:'inline',verticalAlign:'-2px',marginRight:'2px'}}/>:null})()}{ch}
                  </span>
                ))}
                <span style={{fontSize:'11px',color:'#9EB3C8',padding:'2px 8px'}}>
                  {w.frequency==='REALTIME'?'Real-time':w.frequency==='HOURLY'?'Per Jam':'Digest'}
                </span>
              </div>
              <div style={{fontSize:'13px',color:'#9EB3C8'}}>
                {watchStats.stats?.[w.id]?.notifCount||0} notifikasi
                {!watchStats.stats?.[w.id]?.notifCount && <span style={{color:'#F59E0B'}}> · Belum ada match</span>}
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                <button style={{flex:1,padding:'8px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',color:'#5A7090',cursor:'pointer',fontSize:'13px',fontWeight:600}}>Jeda</button>
                <button onClick={()=>openEdit(w)} style={{padding:'8px 14px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',color:'#1560BD',cursor:'pointer',fontSize:'13px'}}>Edit</button>
                <button onClick={()=>testNotif(w.id,w.name)} style={{padding:'8px 14px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',color:'#0F6E56',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center'}} title="Test"><Bell size={14}/></button>
                <button onClick={()=>del(w.id)} style={{padding:'8px 14px',border:'1px solid #FEE2E2',borderRadius:'8px',background:'white',color:'#EF4444',cursor:'pointer',fontSize:'13px'}}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showNearMiss && <NearMissModal items={nearMissItems} onClose={()=>setShowNearMiss(false)} />}
      {toast&&<div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',zIndex:99998,background:toast.type==='ok'?'#0F6E56':'#EF4444',color:'white',padding:'12px 24px',borderRadius:'12px',fontSize:'14px',fontWeight:600,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',whiteSpace:'nowrap'}}>{toast.msg}</div>}
    </div>
  )
}