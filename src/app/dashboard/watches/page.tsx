'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ConfirmModal from '@/components/ConfirmModal'
const CATS = [
  {k:'TENDER',l:'Tender & Pengadaan',i:'📋'},{k:'PROPERTI',l:'Properti',i:'🏠'},{k:'BEASISWA',l:'Beasiswa',i:'🎓'},{k:'BANTUAN',l:'Bantuan & Subsidi',i:'🤝'},
  {k:'KENDARAAN',l:'Kendaraan',i:'🚗'},{k:'BEASISWA',l:'Beasiswa',i:'🎓'},
  {k:'BISNIS',l:'Peluang Bisnis',i:'💼'},{k:'INVESTASI',l:'Investasi',i:'📈'},
  {k:'LOWONGAN',l:'Lowongan Kerja',i:'👔'},{k:'BANTUAN',l:'Bantuan Pemerintah',i:'🤝'},
]
const CHANNELS = [
  {k:'EMAIL',i:'📧',l:'Email',free:true},
  {k:'WHATSAPP',i:'💬',l:'WhatsApp',free:false},
  {k:'TELEGRAM',i:'✈️',l:'Telegram',free:false},
  {k:'PUSH',i:'🔔',l:'Push Notif',free:false},
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
  const [locLoading, setLocLoading] = useState(false)
  const [showLocSuggestions, setShowLocSuggestions] = useState(false)
  const [showEditLocSuggestions, setShowEditLocSuggestions] = useState(false)
  const KOTA_POPULER = ['Jakarta Selatan','Jakarta Utara','Jakarta Barat','Jakarta Timur','Jakarta Pusat','Depok','Bekasi','Tangerang','Bogor','Bandung','Surabaya','Medan','Semarang','Makassar','Yogyakarta','Palembang','Bali','Malang','Batam','Balikpapan']
  const [editWatch, setEditWatch] = useState<any>(null)
  const [editForm, setEditForm] = useState({name:'',queryText:'',location:'',priceMin:'',priceMax:'',mustInclude:'',exclude:'',frequency:'REALTIME'})
  const [editLoading, setEditLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{open:boolean,title:string,message:string,onConfirm:()=>void,color?:string}>({open:false,title:'',message:'',onConfirm:()=>{}})
  const [toast, setToast] = useState<{msg:string,type:'ok'|'err'}|null>(null)
  const showToast = (msg:string,type:'ok'|'err'='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),3500)}
  const detectLocation = async(setter:(v:string)=>void)=>{
    if(!navigator.geolocation){showToast('Browser tidak mendukung deteksi lokasi','err');return}
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      try{
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=id`)
        const d = await r.json()
        const addr = d.address
        const lokasi = [addr.city||addr.town||addr.county||addr.state_district, addr.state].filter(Boolean).join(', ')
        setter(lokasi||'Lokasi tidak ditemukan')
      }catch{setter('Gagal mendapatkan nama lokasi')}
      setLocLoading(false)
    },()=>{showToast('Izin lokasi ditolak. Ketik manual ya.','err');setLocLoading(false)})
  }
  useEffect(()=>{
    fetch('/api/watches').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setWatches(d) })
    fetch('/api/watches/stats').then(r=>r.json()).then(d=>{ if(d.stats) setWatchStats(d) })
  },[])
  const toggleChannel = (k:string, free:boolean) => {
    if (!free && !isPro) { showToast('Channel ini tersedia di plan Pro. Upgrade dulu!','err'); return }
    setSelectedChannels(prev => prev.includes(k) ? (prev.length>1?prev.filter(c=>c!==k):prev) : [...prev,k])
  }
  const submit = async () => {
    if (!form.name||!form.queryText) { showToast('Nama dan deskripsi wajib diisi','err'); return }
    setLoading(true)
    const res = await fetch('/api/watches',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...form,channels:selectedChannels,filters:{location:form.location||undefined,
        priceMin:form.priceMin?Number(form.priceMin):undefined,priceMax:form.priceMax?Number(form.priceMax):undefined,
        mustInclude:form.mustInclude||undefined,exclude:form.exclude||undefined}})})
    const data = await res.json()
    if(res.ok){setWatches([data,...watches]);setShowForm(false);setForm({name:'',category:'TENDER',queryText:'',location:'',priceMin:'',priceMax:'',mustInclude:'',exclude:'',frequency:'REALTIME'});setSelectedChannels(['EMAIL'])}
    else showToast(data.error||'Gagal membuat pantauan','err')
    setLoading(false)
  }
  const openEdit = (w:any) => {
    setEditWatch(w)
    setEditForm({name:w.name,queryText:w.queryText,location:w.filters?.location||'',priceMin:w.filters?.priceMin||'',priceMax:w.filters?.priceMax||'',mustInclude:w.filters?.mustInclude||'',exclude:w.filters?.exclude||'',frequency:w.frequency??'REALTIME'})
  }
  const submitEdit = async () => {
    setEditLoading(true)
    const res = await fetch('/api/watches',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:editWatch.id,name:editForm.name,queryText:editForm.queryText,frequency:editForm.frequency,
        filters:{location:editForm.location||undefined,priceMin:editForm.priceMin?Number(editForm.priceMin):undefined,
          priceMax:editForm.priceMax?Number(editForm.priceMax):undefined,mustInclude:editForm.mustInclude||undefined,exclude:editForm.exclude||undefined}})})
    if(res.ok){const d=await res.json();setWatches(watches.map(w=>w.id===d.id?d:w));setEditWatch(null)}
    else showToast('Gagal menyimpan','err')
    setEditLoading(false)
  }
  const del = (id:string)=>{
    setConfirmModal({open:true,title:'Hapus Pantauan',message:'Pantauan ini akan dihapus permanen. Lanjutkan?',color:'#EF4444',onConfirm:async()=>{
      setConfirmModal(m=>({...m,open:false}))
      await fetch('/api/watches',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
      setWatches(watches.filter(w=>w.id!==id))
    }})
  }
  const testNotif = (watchId:string,watchName:string)=>{
    setConfirmModal({open:true,title:'Test Notifikasi',message:`Kirim test notifikasi untuk pantauan "${watchName}"?`,color:'#1560BD',onConfirm:async()=>{
      setConfirmModal(m=>({...m,open:false}))
      const res = await fetch('/api/notifications/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({watchId})})
      const data = await res.json()
      if(res.ok) showToast('Test notifikasi berhasil dikirim! Cek email, WA, atau Telegram kamu.')
      else showToast('Gagal kirim notifikasi: '+(data.error||'Coba lagi'),'err')
    }})
  }
  const inp={width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'8px',fontSize:'14px',outline:'none',fontFamily:'inherit',background:'white',boxSizing:'border-box' as const}
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:800}}>Pantau.in 🔍</h1>
          <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>{isPro?`${watches.length} pantauan aktif`:`${watches.length}/3 digunakan (Plan Gratis)`}</p>
        </div>
        <button onClick={()=>setShowForm(true)} style={{background:'#1560BD',color:'white',border:'none',borderRadius:'10px',padding:'10px 20px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
          + Tambah Pantau.in
        </button>
      </div>

      {!isPro&&(
        <div style={{background:'linear-gradient(135deg,#1560BD,#0F6E56)',borderRadius:'14px',padding:'20px 24px',marginBottom:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',flexWrap:'wrap'}}>
          <div>
            <p style={{color:'white',fontWeight:700,marginBottom:'4px'}}>🚀 Upgrade ke Pro — Rp 49.000/bln</p>
            <p style={{color:'rgba(255,255,255,0.8)',fontSize:'13px'}}>Unlimited queries, real-time, WA + Telegram + Email</p>
          </div>
          <a href="/dashboard/upgrade" style={{background:'white',color:'#1560BD',fontWeight:700,padding:'10px 20px',borderRadius:'10px',textDecoration:'none',fontSize:'14px',whiteSpace:'nowrap'}}>Upgrade →</a>
        </div>
      )}

      {showForm&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div className="modal-sheet">
            <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',padding:'20px 24px',borderRadius:'20px 20px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',margin:'0 0 2px'}}>🔍 Pantau.in</p>
                <h3 style={{fontWeight:800,fontSize:'18px',color:'white',margin:0}}>Buat Pantauan Baru</h3>
              </div>
              <button onClick={()=>setShowForm(false)} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:'10px',width:'36px',height:'36px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{padding:'20px 24px',display:'grid',gap:'14px'}}>
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
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Deskripsi Pencarian *</label>
                <input value={form.queryText} onChange={e=>setForm({...form,queryText:e.target.value})} placeholder="Contoh: tanah 500m² di Depok maks Rp 1 miliar" style={inp}/>
                <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'4px'}}>Tulis seperti menjelaskan ke teman. AI kami akan memahami konteksnya.</p>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Lokasi <span style={{fontWeight:400,color:'#9EB3C8'}}>(opsional)</span></label>
                <div style={{position:'relative'}}>
                  <div style={{display:'flex',gap:'8px'}}>
                    <input value={form.location} onChange={e=>{setForm({...form,location:e.target.value});setShowLocSuggestions(e.target.value.length>0)}}
                      onFocus={()=>setShowLocSuggestions(true)} onBlur={()=>setTimeout(()=>setShowLocSuggestions(false),200)}
                      placeholder="Ketik kota atau klik deteksi lokasi" style={{...inp,flex:1}}/>
                    <button type="button" onClick={()=>detectLocation(v=>setForm({...form,location:v}))} disabled={locLoading}
                      style={{padding:'10px 12px',background:'#E8F0FB',border:'1.5px solid #C7D9F8',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:600,color:'#1560BD',whiteSpace:'nowrap',flexShrink:0}}>
                      {locLoading?'⏳':'📍'} {locLoading?'Mendeteksi...':'Lokasiku'}
                    </button>
                  </div>
                  {showLocSuggestions&&(
                    <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1.5px solid #DDE5EF',borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',zIndex:100,maxHeight:'200px',overflowY:'auto',marginTop:'4px'}}>
                      {KOTA_POPULER.filter(k=>!form.location||k.toLowerCase().includes(form.location.toLowerCase())).map(k=>(
                        <div key={k} onClick={()=>{setForm({...form,location:k});setShowLocSuggestions(false)}}
                          style={{padding:'10px 14px',cursor:'pointer',fontSize:'13px',borderBottom:'1px solid #F1F5F9'}}
                          onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#F8FAFC'}
                          onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=''}>
                          📍 {k}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))',gap:'12px'}}>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Min (Rp)</label>
                  <input type="number" value={form.priceMin} onChange={e=>setForm({...form,priceMin:e.target.value})} placeholder="0" style={inp}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Max (Rp)</label>
                  <input type="number" value={form.priceMax} onChange={e=>setForm({...form,priceMax:e.target.value})} placeholder="Kosong = tak terbatas" style={inp}/>
                </div>
              </div>
              {isPro&&(
                <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px',display:'grid',gap:'12px'}}>
                  <p style={{fontSize:'13px',fontWeight:700,color:'#0D1B2A',margin:0}}>🎯 Kata Kunci Tambahan (Opsional)</p>
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harus mengandung kata ini <span style={{fontWeight:400,color:'#9EB3C8'}}>pisah koma — opsional</span></label>
                    <input value={form.mustInclude} onChange={e=>setForm({...form,mustInclude:e.target.value})} placeholder="Contoh: SHM, hook jalan, 2 lantai" style={inp}/>
                    <p style={{fontSize:'12px',color:'#9EB3C8',margin:'4px 0 0'}}>Hasil hanya muncul jika mengandung semua kata ini. Kosongkan jika tidak perlu.</p>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Jangan tampilkan jika ada kata ini <span style={{fontWeight:400,color:'#9EB3C8'}}>pisah koma — opsional</span></label>
                    <input value={form.exclude} onChange={e=>setForm({...form,exclude:e.target.value})} placeholder="Contoh: rusak, banjir, sengketa, lelang" style={inp}/>
                    <p style={{fontSize:'12px',color:'#9EB3C8',margin:'4px 0 0'}}>Hasil yang mengandung kata ini akan disembunyikan. Kosongkan jika tidak perlu.</p>
                  </div>
                </div>
              )}
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>Kirim Notifikasi ke</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px'}}>
                  {CHANNELS.map(ch=>{
                    const sel=selectedChannels.includes(ch.k); const locked=!ch.free&&!isPro
                    return (
                      <button key={ch.k} type="button" onClick={()=>toggleChannel(ch.k,ch.free)}
                        style={{padding:'10px 12px',border:`2px solid ${sel?'#1560BD':'#DDE5EF'}`,borderRadius:'10px',
                          background:sel?'#E8F0FB':'white',cursor:'pointer',fontSize:'13px',fontWeight:600,textAlign:'left' as const,
                          opacity:locked?0.6:1,display:'flex',alignItems:'center',gap:'6px'}}>
                        <span>{ch.i}</span><span>{ch.l}</span>
                        {locked&&<span style={{fontSize:'10px',background:'#E8F0FB',color:'#1560BD',padding:'1px 6px',borderRadius:'100px',marginLeft:'auto'}}>Pro</span>}
                        {sel&&!locked&&<span style={{color:'#0F6E56',marginLeft:'auto'}}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              {isPro&&(
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Frekuensi</label>
                  <select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} style={inp}>
                    <option value="REALTIME">⚡ Real-time</option>
                    <option value="HOURLY">🕐 Setiap Jam</option>
                    <option value="DAILY">📅 Digest Harian</option>
                  </select>
                </div>
              )}
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px'}}>
                <button onClick={()=>setShowForm(false)} style={{padding:'10px 20px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px'}}>Batal</button>
                <button onClick={submit} disabled={loading} style={{padding:'10px 20px',background:'#1560BD',color:'white',border:'none',borderRadius:'8px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  {loading?'⏳ Menyimpan...':'✓ Buat Pantauan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editWatch&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setEditWatch(null)}}>
          <div className="modal-sheet">
            <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',padding:'20px 24px',borderRadius:'20px 20px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',margin:'0 0 2px'}}>✏️ Edit</p>
                <h3 style={{fontWeight:800,fontSize:'18px',color:'white',margin:0}}>Edit Pantauan</h3>
              </div>
              <button onClick={()=>setEditWatch(null)} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:'10px',width:'36px',height:'36px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{padding:'20px 24px',display:'grid',gap:'14px'}}>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Nama Pantauan *</label>
                <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Deskripsi Pencarian *</label>
                <input value={editForm.queryText} onChange={e=>setEditForm({...editForm,queryText:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Lokasi <span style={{fontWeight:400,color:'#9EB3C8'}}>(opsional)</span></label>
                <div style={{position:'relative'}}>
                  <div style={{display:'flex',gap:'8px'}}>
                    <input value={editForm.location} onChange={e=>{setEditForm({...editForm,location:e.target.value});setShowEditLocSuggestions(e.target.value.length>0)}}
                      onFocus={()=>setShowEditLocSuggestions(true)} onBlur={()=>setTimeout(()=>setShowEditLocSuggestions(false),200)}
                      placeholder="Ketik kota atau klik deteksi lokasi" style={{...inp,flex:1}}/>
                    <button type="button" onClick={()=>detectLocation(v=>setEditForm({...editForm,location:v}))} disabled={locLoading}
                      style={{padding:'10px 12px',background:'#E8F0FB',border:'1.5px solid #C7D9F8',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:600,color:'#1560BD',whiteSpace:'nowrap',flexShrink:0}}>
                      {locLoading?'⏳':'📍'} {locLoading?'Mendeteksi...':'Lokasiku'}
                    </button>
                  </div>
                  {showEditLocSuggestions&&(
                    <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1.5px solid #DDE5EF',borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',zIndex:100,maxHeight:'200px',overflowY:'auto',marginTop:'4px'}}>
                      {KOTA_POPULER.filter(k=>!editForm.location||k.toLowerCase().includes(editForm.location.toLowerCase())).map(k=>(
                        <div key={k} onClick={()=>{setEditForm({...editForm,location:k});setShowEditLocSuggestions(false)}}
                          style={{padding:'10px 14px',cursor:'pointer',fontSize:'13px',borderBottom:'1px solid #F1F5F9'}}
                          onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#F8FAFC'}
                          onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=''}>
                          📍 {k}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))',gap:'12px'}}>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Min (Rp)</label>
                  <input type="number" value={editForm.priceMin} onChange={e=>setEditForm({...editForm,priceMin:e.target.value})} style={inp}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Max (Rp)</label>
                  <input type="number" value={editForm.priceMax} onChange={e=>setEditForm({...editForm,priceMax:e.target.value})} style={inp}/>
                </div>
              </div>
              {isPro&&(
                <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px',display:'grid',gap:'12px'}}>
                  <p style={{fontSize:'13px',fontWeight:700,color:'#0D1B2A',margin:0}}>🎯 Kata Kunci Tambahan (Opsional)</p>
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harus mengandung kata ini <span style={{fontWeight:400,color:'#9EB3C8'}}>pisah koma — opsional</span></label>
                    <input value={editForm.mustInclude} onChange={e=>setEditForm({...editForm,mustInclude:e.target.value})} placeholder="Contoh: SHM, hook jalan, 2 lantai" style={inp}/>
                    <p style={{fontSize:'12px',color:'#9EB3C8',margin:'4px 0 0'}}>Hasil hanya muncul jika mengandung semua kata ini. Kosongkan jika tidak perlu.</p>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Jangan tampilkan jika ada kata ini <span style={{fontWeight:400,color:'#9EB3C8'}}>pisah koma — opsional</span></label>
                    <input value={editForm.exclude} onChange={e=>setEditForm({...editForm,exclude:e.target.value})} placeholder="Contoh: rusak, banjir, sengketa, lelang" style={inp}/>
                    <p style={{fontSize:'12px',color:'#9EB3C8',margin:'4px 0 0'}}>Hasil yang mengandung kata ini akan disembunyikan. Kosongkan jika tidak perlu.</p>
                  </div>
                </div>
              )}
              {isPro&&(
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Frekuensi</label>
                  <select value={editForm.frequency} onChange={e=>setEditForm({...editForm,frequency:e.target.value})} style={inp}>
                    <option value="REALTIME">⚡ Real-time</option>
                    <option value="HOURLY">🕐 Setiap Jam</option>
                    <option value="DAILY">📅 Digest Harian</option>
                  </select>
                </div>
              )}
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px'}}>
                <button onClick={()=>setEditWatch(null)} style={{padding:'10px 20px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px'}}>Batal</button>
                <button onClick={submitEdit} disabled={editLoading} style={{padding:'10px 20px',background:'#1560BD',color:'white',border:'none',borderRadius:'8px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  {editLoading?'⏳ Menyimpan...':'✓ Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {watchStats.totalSources>0&&(
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'14px 18px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',flex:1}}>
            <div style={{width:'10px',height:'10px',borderRadius:'50%',background:watchStats.healthySources===watchStats.totalSources?'#10B981':watchStats.healthySources>watchStats.totalSources/2?'#F59E0B':'#EF4444',flexShrink:0}}/>
            <span style={{fontSize:'13px',fontWeight:600,color:'#0D1B2A'}}>{watchStats.healthySources}/{watchStats.totalSources} sumber aktif & segar</span>
          </div>
          <span style={{fontSize:'12px',color:'#9EB3C8'}}>Update setiap 5 menit</span>
        </div>
      )}

      {watches.length===0?(
        <div style={{textAlign:'center',padding:'60px 20px',color:'#9EB3C8'}}>
          <p style={{fontSize:'48px',marginBottom:'16px'}}>🔍</p>
          <p style={{fontSize:'18px',fontWeight:700,color:'#5A7090',marginBottom:'8px'}}>Belum ada pantauan</p>
          <p style={{fontSize:'14px',marginBottom:'24px'}}>Tambah pantauan pertamamu dan mulai terima notifikasi peluang!</p>
          <button onClick={()=>setShowForm(true)} style={{background:'#1560BD',color:'white',border:'none',borderRadius:'10px',padding:'12px 24px',fontWeight:700,cursor:'pointer',fontSize:'15px'}}>+ Tambah Pantauan Pertama</button>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,320px),1fr))',gap:'16px'}}>
          {watches.map(w=>(
            <div key={w.id} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px',display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:'11px',background:'#E8F0FB',color:'#1560BD',padding:'2px 8px',borderRadius:'100px',fontWeight:600,display:'inline-block',marginBottom:'6px'}}>
                    {CATS.find(c=>c.k===w.category)?.i} {CATS.find(c=>c.k===w.category)?.l}
                  </span>
                  <h3 style={{fontSize:'16px',fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.name}</h3>
                  <p style={{fontSize:'13px',color:'#5A7090',margin:'4px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>"{w.queryText}"</p>
                </div>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#10B981',flexShrink:0,marginTop:'4px'}}/>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {(w.channels||['EMAIL']).map((ch:string)=>(
                  <span key={ch} style={{fontSize:'11px',background:'#F0F4F9',color:'#5A7090',padding:'2px 8px',borderRadius:'100px',fontWeight:600}}>
                    {CHANNELS.find(c=>c.k===ch)?.i} {ch}
                  </span>
                ))}
                <span style={{fontSize:'11px',color:'#9EB3C8',padding:'2px 8px',borderRadius:'100px'}}>
                  {w.frequency==='REALTIME'?'⚡ Real-time':w.frequency==='HOURLY'?'🕐 Per Jam':'📅 Digest'}
                </span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'#9EB3C8'}}>
                <span>🔔 {watchStats.stats?.[w.id]?.notifCount||0} notifikasi</span>
                {watchStats.stats?.[w.id]?.lastMatch&&<span>· {new Date(watchStats.stats[w.id].lastMatch).toLocaleDateString('id-ID')}</span>}
                {!watchStats.stats?.[w.id]?.notifCount&&<span style={{color:'#F59E0B'}}>Belum ada match</span>}
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                <button style={{flex:1,padding:'8px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',color:'#5A7090',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
                  ⏸ Jeda
                </button>
                <button onClick={()=>openEdit(w)} style={{padding:'8px 14px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',color:'#1560BD',cursor:'pointer',fontSize:'13px',fontWeight:600}}>✏️</button>
                <button onClick={()=>testNotif(w.id,w.name)} style={{padding:'8px 14px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',color:'#0F6E56',cursor:'pointer',fontSize:'13px',fontWeight:600}} title="Test Notifikasi">🔔</button>
                <button onClick={()=>del(w.id)} style={{padding:'8px 14px',border:'1px solid #FEE2E2',borderRadius:'8px',background:'white',color:'#EF4444',cursor:'pointer',fontSize:'13px',fontWeight:600}}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {toast&&<div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',zIndex:99998,background:toast.type==='ok'?'#0F6E56':'#EF4444',color:'white',padding:'12px 24px',borderRadius:'12px',fontSize:'14px',fontWeight:600,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',whiteSpace:'nowrap'}}>{toast.msg}</div>}
      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} confirmColor={confirmModal.color} onConfirm={confirmModal.onConfirm} onCancel={()=>setConfirmModal(m=>({...m,open:false}))}/>
    </div>
  )
}
