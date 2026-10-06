'use client'
import { Mail, MessageCircle, Send, Bell, User, Lock, Settings, Star, Moon, ClipboardList, Target } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TwoFactorSettings from '@/components/TwoFactorSettings'
import ConfirmModal from '@/components/ConfirmModal'

const CHANNELS = [
  {k:'EMAIL',i:'📧',icon:Mail,l:'Email',d:'Kirim ke inbox email kamu',free:true},
  {k:'WHATSAPP',i:'💬',icon:MessageCircle,l:'WhatsApp',d:'Via WA Business API resmi',free:false},
  {k:'TELEGRAM',i:'✈️',icon:Send,l:'Telegram',d:'Bot @pantauin_bot',free:false},
  {k:'PUSH',i:'🔔',icon:Bell,l:'Push Notification',d:'Browser & mobile app',free:false},
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isPro = user?.plan !== 'FREE'

  const [activeTab, setActiveTab] = useState('notif')
  const [bizType, setBizType] = useState('')
  const [bizDesc, setBizDesc] = useState('')
  const [bizCity, setBizCity] = useState('')
  const [bizBudget, setBizBudget] = useState('')
  const [bizSaved, setBizSaved] = useState(false)
  const [bizLoading, setBizLoading] = useState(false)
  const [channels, setChannels] = useState<string[]>(['EMAIL'])
  const [enabled, setEnabled] = useState(true)
  const [whatsapp, setWhatsapp] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('07:00')
  const [confirmModal, setConfirmModal] = useState<{open:boolean,title:string,message:string,onConfirm:()=>void}>({open:false,title:'',message:'',onConfirm:()=>{}})
  const [msg, setMsg] = useState<{type:'ok'|'err',text:string}|null>(null)

  useEffect(()=>{
    fetch('/api/user/profile').then(r=>r.json()).then(d=>{
      if(d.businessType) setBizType(d.businessType)
      if(d.businessDesc) setBizDesc(d.businessDesc)
      if(d.businessCity) setBizCity(d.businessCity)
      if(d.businessBudget) setBizBudget(d.businessBudget)
    })
    fetch('/api/user/channels').then(r=>r.json()).then(d=>{
      if(d.quietStart) setQuietStart(d.quietStart)
      if(d.quietEnd) setQuietEnd(d.quietEnd)
    })
    fetch('/api/user/profile').then(r=>r.json()).then(d=>{
      if(d.notifChannels) setChannels(d.notifChannels)
      if(d.notifEnabled!==undefined) setEnabled(d.notifEnabled)
      if(d.whatsapp) setWhatsapp(d.whatsapp)
      if(d.telegramId) setTelegramId(d.telegramId)
      if(d.name) setName(d.name)
      if(d.phone) setPhone(d.phone||'')
      if(d.quietStart) setQuietStart(d.quietStart)
      if(d.quietEnd) setQuietEnd(d.quietEnd)
    })
  },[])

  const showMsg = (type:'ok'|'err', text:string) => {
    setMsg({type,text})
    setTimeout(()=>setMsg(null),3000)
  }

  const toggleChannel = (k:string, free:boolean) => {
    if(!free&&!isPro){showMsg('err','Channel ini tersedia di plan Pro. Upgrade dulu!');return}
    setChannels(p=>p.includes(k)?(p.length>1?p.filter(c=>c!==k):p):[...p,k])
  }

  const saveNotif = async() => {
    setSaving(true)
    const res = await fetch('/api/user/channels',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({notifChannels:channels,notifEnabled:enabled,whatsapp,telegramId,quietStart,quietEnd})})
    const data = await res.json()
    setSaving(false)
    if(res.ok) showMsg('ok','Pengaturan notifikasi tersimpan!')
    else showMsg('err',data.error||'Gagal menyimpan')
  }

  const [testing, setTesting] = useState(false)
  const testNotif = async() => {
    setTesting(true)
    try {
      // simpan setelan terbaru dulu biar channel/nomor kepakai
      await fetch('/api/user/channels',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({notifChannels:channels,notifEnabled:enabled,whatsapp,telegramId,quietStart,quietEnd})})
      // ambil watch pertama user
      const wr = await fetch('/api/watches')
      const wd = await wr.json()
      const list = Array.isArray(wd) ? wd : (wd.watches || wd.data || [])
      if (!list.length) { showMsg('err','Buat dulu minimal 1 pantauan buat ngetes notifikasi.'); setTesting(false); return }
      const res = await fetch('/api/notifications/test',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({watchId:list[0].id})})
      const data = await res.json()
      if (res.ok) {
        const sent = Object.entries(data.results||{}).filter(([k,v])=>v===true).map(([k])=>k.toUpperCase())
        showMsg('ok', sent.length ? `Notifikasi tes terkirim via ${sent.join(' + ')} \u2705` : 'Tes terkirim, cek channel kamu.')
      } else {
        showMsg('err', data.error || 'Gagal mengirim tes.')
      }
    } catch(e:any) {
      showMsg('err','Gagal: '+(e?.message||'error tak dikenal'))
    }
    setTesting(false)
  }

  const saveProfile = async() => {
    setSaving(true)
    const res = await fetch('/api/user/profile',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,phone,whatsapp,telegramId})})
    const data = await res.json()
    setSaving(false)
    if(res.ok){ if(data.waNeedsVerify){ window.location.href='/verify-whatsapp?next='+encodeURIComponent('/dashboard/settings'); return } showMsg('ok','Profil berhasil diperbarui!') }
    else showMsg('err',data.error||'Gagal menyimpan')
  }

  const savePassword = async() => {
    if(newPass!==confirmPass){showMsg('err','Password baru tidak cocok');return}
    setSaving(true)
    const res = await fetch('/api/user/profile',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({currentPassword:currentPass,newPassword:newPass})})
    const data = await res.json()
    setSaving(false)
    if(res.ok){showMsg('ok','Password berhasil diubah!');setCurrentPass('');setNewPass('');setConfirmPass('')}
    else showMsg('err',data.error||'Gagal mengubah password')
  }

  const inp={width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'8px',fontSize:'14px',outline:'none',fontFamily:'inherit',background:'white'} as React.CSSProperties

  const TABS = [{k:'notif',l:'Notifikasi',icon:Bell},{k:'profile',l:'Profil',icon:User},{k:'security',l:'Keamanan',icon:Lock}]

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:800,display:'flex',alignItems:'center',gap:'8px'}}>Pengaturan <Settings size={20}/></h1>
        <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>Kelola preferensi akun dan notifikasimu.</p>
      </div>

      {msg&&<div style={{padding:'12px 16px',borderRadius:'10px',marginBottom:'16px',fontSize:'14px',fontWeight:500,
        background:msg.type==='ok'?'#E1F5EE':'#FEE2E2',color:msg.type==='ok'?'#0F6E56':'#991B1B',
        border:`1px solid ${msg.type==='ok'?'#9FE1CB':'#FECACA'}`}}>{msg.text}</div>}

      <div style={{display:'flex',gap:'4px',background:'#F8FAFC',borderRadius:'12px',padding:'4px',marginBottom:'24px',width:'fit-content'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)}
            style={{padding:'8px 18px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,
              background:activeTab===t.k?'white':'transparent',color:activeTab===t.k?'#1560BD':'#5A7090',
              boxShadow:activeTab===t.k?'0 1px 4px rgba(0,0,0,0.08)':'none',display:'inline-flex',alignItems:'center',gap:'6px'}}><t.icon size={15}/>{t.l}</button>
        ))}
      </div>

      {/* ── NOTIFIKASI ── */}
      {activeTab==='notif'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          {/* Master toggle */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{fontWeight:700,fontSize:'15px',marginBottom:'4px'}}>Notifikasi Aktif</h3>
                <p style={{color:'#5A7090',fontSize:'13px',margin:0}}>Terima notifikasi saat peluang baru ditemukan AI</p>
              </div>
              <button onClick={()=>setEnabled(!enabled)}
                style={{width:'48px',height:'26px',borderRadius:'100px',border:'none',cursor:'pointer',position:'relative',
                  background:enabled?'#1560BD':'#DDE5EF',transition:'background .2s'}}>
                <span style={{position:'absolute',top:'3px',width:'20px',height:'20px',borderRadius:'50%',background:'white',
                  transition:'left .2s',left:enabled?'25px':'3px',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
              </button>
            </div>
          </div>

          {/* Channel selector */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px',opacity:enabled?1:0.5}}>
            <h3 style={{fontWeight:700,fontSize:'15px',marginBottom:'4px'}}>Channel Notifikasi</h3>
            <p style={{color:'#5A7090',fontSize:'13px',marginBottom:'16px'}}>
              Pilih cara kamu ingin menerima notifikasi. Bisa pilih lebih dari satu.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'10px',marginBottom:'16px'}}>
              {CHANNELS.map(ch=>{
                const sel=channels.includes(ch.k)
                const locked=!ch.free&&!isPro
                return (
                  <button key={ch.k} onClick={()=>!locked&&toggleChannel(ch.k,ch.free)}
                    style={{padding:'14px 16px',border:`2px solid ${sel?'#1560BD':'#DDE5EF'}`,borderRadius:'12px',
                      background:sel?'#E8F0FB':'white',cursor:locked?'not-allowed':'pointer',textAlign:'left',opacity:locked?0.6:1,
                      transition:'all .2s'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                      <ch.icon size={22}/>
                      <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                        {locked&&<span style={{fontSize:'10px',fontWeight:700,background:'#E8F0FB',color:'#1560BD',padding:'2px 7px',borderRadius:'100px'}}>Pro</span>}
                        {sel&&!locked&&<span style={{color:'#0F6E56',fontWeight:700,fontSize:'16px'}}>✓</span>}
                      </div>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',margin:'0 0 3px',color:sel?'#1560BD':'#0D1B2A'}}>{ch.l}</p>
                    <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>{ch.d}</p>
                  </button>
                )
              })}
            </div>

            {!isPro&&(
              <div style={{background:'#E8F0FB',borderRadius:'10px',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
                <p style={{fontSize:'13px',color:'#1560BD',fontWeight:500,margin:0,display:'flex',alignItems:'center',gap:'6px'}}><Star size={14}/> WhatsApp, Telegram & Push tersedia di plan Pro</p>
                <a href="/dashboard/upgrade" style={{fontSize:'13px',fontWeight:700,color:'#1560BD',textDecoration:'none',whiteSpace:'nowrap'}}>Upgrade →</a>
              </div>
            )}
          </div>

          {/* WhatsApp number - tampil jika WA dipilih */}
          {channels.includes('WHATSAPP')&&isPro&&(
            <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px'}}>
              <h3 style={{fontWeight:700,fontSize:'15px',marginBottom:'4px',display:'flex',alignItems:'center',gap:'6px'}}><MessageCircle size={16}/> Nomor WhatsApp Kamu</h3>
              <p style={{color:'#5A7090',fontSize:'13px',marginBottom:'12px'}}>
                Notifikasi WA akan dikirim ke nomor ini. Pastikan nomor terdaftar di WhatsApp.
              </p>
              <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxx atau +628xxxxxxxxxx" style={inp}/>
              <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'6px'}}>
                Format: 08xxxxxxxxxx atau +62xxxxxxxxxx
              </p>
            </div>
          )}

          {/* Telegram ID - tampil jika Telegram dipilih */}
          {channels.includes('TELEGRAM')&&isPro&&(
            <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px'}}>
              <h3 style={{fontWeight:700,fontSize:'15px',marginBottom:'4px',display:'flex',alignItems:'center',gap:'6px'}}><Send size={16}/> Telegram Chat ID</h3>
              <p style={{color:'#5A7090',fontSize:'13px',marginBottom:'12px'}}>
                Cara mendapatkan Chat ID:
              </p>
              <ol style={{fontSize:'13px',color:'#5A7090',paddingLeft:'20px',marginBottom:'12px',lineHeight:1.8}}>
                <li>Buka Telegram, cari <strong>@pantauin_bot</strong></li>
                <li>Klik Start / kirim <code style={{background:'#F1F5F9',padding:'1px 6px',borderRadius:'4px'}}>/start</code></li>
                <li>Bot akan membalas dengan Chat ID kamu</li>
                <li>Copy dan paste di sini</li>
              </ol>
              <input value={telegramId} onChange={e=>setTelegramId(e.target.value)}
                placeholder="Contoh: 123456789" style={inp}/>
            </div>
          )}

          {/* Quiet hours */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px'}}>
            <h3 style={{fontWeight:700,fontSize:'15px',marginBottom:'4px',display:'flex',alignItems:'center',gap:'6px'}}><Moon size={16}/> Jam Tenang (Jangan Ganggu)</h3>
            <p style={{color:'#5A7090',fontSize:'13px',marginBottom:'14px'}}>
              Notifikasi ditahan selama jam tenang dan dikirim setelahnya.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:'12px'}}>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Mulai</label>
                <input type="time" value={quietStart} onChange={e=>setQuietStart(e.target.value)} style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Selesai</label>
                <input type="time" value={quietEnd} onChange={e=>setQuietEnd(e.target.value)} style={inp}/></div>
            </div>
          </div>

          {(channels.includes('WHATSAPP')||channels.includes('TELEGRAM'))&&isPro&&(
            <button onClick={testNotif} disabled={testing||saving}
              style={{padding:'14px',background:'white',color:'#1560BD',border:'2px solid #1560BD',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontSize:'15px',opacity:(testing||saving)?0.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              <Send size={16}/>{testing?'Mengirim tes...':'Kirim Tes Notifikasi'}
            </button>
          )}
          <button onClick={saveNotif} disabled={saving}
            style={{padding:'14px',background:'#1560BD',color:'white',border:'none',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontSize:'15px',opacity:saving?0.7:1}}>
            {saving?'Menyimpan...':'Simpan Pengaturan Notifikasi'}
          </button>
        </div>
      )}

      {/* ── PROFIL ── */}
      {activeTab==='profile'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'20px'}}>Informasi Pribadi</h3>
            <div style={{display:'grid',gap:'14px'}}>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Nama Lengkap</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama kamu" style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Email</label>
                <input value={user?.email||''} readOnly style={{...inp,background:'#F8FAFC',color:'#9EB3C8',cursor:'not-allowed'}}/>
                <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'4px'}}>Email tidak bisa diubah</p>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>No. Telepon</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxxxx" style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>No. WhatsApp</label>
                <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="08xxxxxxxxxx" style={inp}/>
                <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'4px'}}>Digunakan untuk notifikasi WhatsApp (plan Pro)</p>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Telegram Chat ID</label>
                <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:'8px',padding:'12px',marginBottom:'8px',fontSize:'12px',color:'#1e40af'}}>
                <p style={{fontWeight:700,margin:'0 0 4px',display:'flex',alignItems:'center',gap:'6px'}}><ClipboardList size={15}/> Cara mendapatkan Telegram ID:</p>
                <ol style={{margin:0,paddingLeft:'16px',lineHeight:1.8}}>
                  <li>Buka Telegram, cari <strong>@userinfobot</strong></li>
                  <li>Kirim pesan <strong>/start</strong></li>
                  <li>Bot akan balas dengan ID kamu (angka)</li>
                  <li>Paste ID tersebut di kolom di bawah</li>
                </ol>
              </div>
              <input value={telegramId} onChange={e=>setTelegramId(e.target.value)} placeholder="Contoh: 123456789" style={inp}/>
              </div>
            </div>
            <div style={{marginTop:'20px',padding:'14px 16px',background:'#F8FAFC',borderRadius:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{fontWeight:600,fontSize:'14px',margin:0}}>Plan Aktif</p>
                <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>{user?.plan==='FREE'?'Gratis selamanya':'Aktif hingga diperpanjang'}</p>
              </div>
              <span style={{fontSize:'12px',fontWeight:700,padding:'4px 12px',borderRadius:'100px',
                background:user?.plan==='PRO'?'#E8F0FB':user?.plan==='BUSINESS'?'#E1F5EE':'#F1F5F9',
                color:user?.plan==='PRO'?'#1560BD':user?.plan==='BUSINESS'?'#0F6E56':'#64748b'}}>{user?.plan}</span>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            style={{padding:'14px',background:'#1560BD',color:'white',border:'none',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontSize:'15px',opacity:saving?0.7:1}}>
            {saving?'Menyimpan...':'Simpan Profil'}
          </button>
        </div>
      )}

          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px',marginTop:'8px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,#1560BD,#0F6E56)',display:'flex',alignItems:'center',justifyContent:'center'}}><Target size={18} color="white"/></div>
              <div><h3 style={{fontWeight:700,margin:0,fontSize:'15px'}}>Profil Bisnis</h3><p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>AI matching lebih akurat berdasarkan profil kamu</p></div>
            </div>
            <div style={{display:'grid',gap:'14px'}}>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>Tipe Bisnis / Kebutuhan</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,160px),1fr))',gap:'8px'}}>
                  {[{k:'kontraktor',l:'Kontraktor'},{k:'agen_properti',l:'Agen Properti'},{k:'investor',l:'Investor'},{k:'pedagang',l:'Pedagang'},{k:'pencari_kerja',l:'Pencari Kerja'},{k:'pengusaha',l:'Pengusaha'},{k:'mahasiswa',l:'Mahasiswa'},{k:'lainnya',l:'Lainnya'}].map(({k,l})=>(
                    <button key={k} type="button" onClick={()=>setBizType(k)} style={{padding:'9px 12px',border:`2px solid ${bizType===k?'#1560BD':'#DDE5EF'}`,borderRadius:'10px',background:bizType===k?'#E8F0FB':'white',cursor:'pointer',fontSize:'12px',fontWeight:600,textAlign:'left' as const}}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>Ceritakan Kebutuhanmu</label>
                <textarea value={bizDesc} onChange={e=>setBizDesc(e.target.value)} rows={3} placeholder="Contoh: Kontraktor tender konstruksi gedung Jawa Barat 500jt-5 miliar" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'10px',fontSize:'14px',outline:'none',fontFamily:'inherit',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>Kota Operasi</label><input value={bizCity} onChange={e=>setBizCity(e.target.value)} placeholder="Jakarta, Bandung" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'10px',fontSize:'14px',outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>Range Budget</label><select value={bizBudget} onChange={e=>setBizBudget(e.target.value)} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'10px',fontSize:'14px',outline:'none',fontFamily:'inherit',background:'white',boxSizing:'border-box' as const}}><option value="">Pilih</option><option value="<50jt">Di bawah Rp 50 juta</option><option value="50-500jt">Rp 50-500 juta</option><option value="500jt-5m">Rp 500jt-5 miliar</option><option value=">5m">Di atas Rp 5 miliar</option></select></div>
              </div>
              <button onClick={async()=>{setBizLoading(true);const r=await fetch('/api/user/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessType:bizType,businessDesc:bizDesc,businessCity:bizCity,businessBudget:bizBudget})});if(r.ok){setBizSaved(true);setTimeout(()=>setBizSaved(false),3000)};setBizLoading(false)}} disabled={bizLoading} style={{padding:'12px 24px',background:'#0F6E56',color:'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>{bizLoading?'Menyimpan...':bizSaved?'Tersimpan!':'Simpan Profil Bisnis'}</button>
            </div>
          </div>
      {/* ── KEAMANAN ── */}
      {activeTab==='security'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'20px'}}>Ganti Password</h3>
            <div style={{display:'grid',gap:'14px'}}>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Password Saat Ini</label>
                <input type="password" value={currentPass} onChange={e=>setCurrentPass(e.target.value)} placeholder="••••••••" style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Password Baru</label>
                <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Min. 8 karakter" style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Konfirmasi Password Baru</label>
                <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="Ulangi password baru" style={inp}/>
                {newPass&&confirmPass&&newPass!==confirmPass&&(
                  <p style={{fontSize:'12px',color:'#EF4444',marginTop:'4px'}}>⚠️ Password tidak cocok</p>
                )}
              </div>
            </div>
          </div>
          <button onClick={savePassword} disabled={saving||!currentPass||!newPass||newPass!==confirmPass}
            style={{padding:'14px',background:'#1560BD',color:'white',border:'none',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontSize:'15px',opacity:(saving||!currentPass||!newPass||newPass!==confirmPass)?0.5:1}}>
            {saving?'Mengubah...':'Ganti Password'}
          </button>

          <TwoFactorSettings />

          <div style={{background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:'16px',padding:'20px 24px'}}>
            <h3 style={{fontWeight:700,fontSize:'15px',color:'#991B1B',marginBottom:'8px'}}>⚠️ Hapus Akun</h3>
            <p style={{fontSize:'13px',color:'#991B1B',marginBottom:'14px'}}>
              Menghapus akun akan menghapus semua data watch queries, notifikasi, dan riwayat secara permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <button onClick={()=>setConfirmModal({open:true,title:'Hapus Akun',message:'Tindakan ini TIDAK BISA dibatalkan. Semua data, pantauan, dan notifikasi akan dihapus permanen.',onConfirm:()=>{setConfirmModal(m=>({...m,open:false}));setConfirmModal({open:true,title:'Hapus Akun',message:'Untuk menghapus akun, hubungi kami di pantau.inofficial@gmail.com',onConfirm:()=>setConfirmModal(m=>({...m,open:false}))})}})}
              style={{padding:'10px 20px',background:'white',color:'#EF4444',border:'1.5px solid #EF4444',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
              Hapus Akun Saya
            </button>
          </div>
        </div>
      )}
      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} confirmColor='#EF4444' confirmLabel='Ya, Hapus Akun' onConfirm={confirmModal.onConfirm} onCancel={()=>setConfirmModal(m=>({...m,open:false}))}/>
    </div>
  )
}
