'use client'
import { useSession } from 'next-auth/react'
import OnboardingModal from '@/components/OnboardingModal'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'

function DashContent() {
  const {data:session} = useSession()
  const params = useSearchParams()
  const user = session?.user as any
  const isPro = user?.plan !== 'FREE'
  const planExpiry = user?.planExpiresAt ? new Date(user.planExpiresAt) : null
  const planExpiryStr = planExpiry ? planExpiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const [stats, setStats] = useState({watches:0,unread:0,total:0})
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [dashStats, setDashStats] = useState<any>(null)

  useEffect(()=>{
    fetch('/api/watches').then(r=>r.json()).then(d=>{ if(Array.isArray(d)){ const active=d.filter((w:any)=>w.isActive).length; setStats(s=>({...s,watches:active})); if(active===0&&params.get('onboarding')==='1') setShowOnboarding(true) } })
    fetch('/api/notifications?limit=1').then(r=>r.json()).then(d=>{ if(d.unread!==undefined) setStats(s=>({...s,unread:d.unread,total:d.notifications?.length||0})) })
    fetch('/api/dashboard/stats').then(r=>r.json()).then(d=>{ if(d.chartData) setDashStats(d) })
  },[])

  return (
    <div>
      {showOnboarding && <OnboardingModal userName={user?.name?.split(' ')[0] ?? 'Kamu'} onClose={()=>setShowOnboarding(false)} />}
      {params.get('onboarding')==='1'&&stats.watches===0&&(
        <div style={{background:'linear-gradient(135deg,#0F6E56,#1560BD)',borderRadius:'16px',padding:'24px',marginBottom:'24px',color:'white'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:'16px',flexWrap:'wrap'}}>
            <div style={{fontSize:'40px'}}>👋</div>
            <div style={{flex:1}}>
              <p style={{fontWeight:800,fontSize:'18px',margin:'0 0 6px'}}>Selamat datang di pantau.in!</p>
              <p style={{fontSize:'14px',opacity:0.85,margin:'0 0 16px'}}>Kamu hanya perlu <strong>1 langkah</strong> untuk mulai menerima peluang otomatis — buat pantauan pertamamu sekarang.</p>
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                <a href="/dashboard/watches?new=1" style={{background:'white',color:'#1560BD',fontWeight:700,padding:'10px 20px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>
                  🔍 Buat Pantauan Pertama →
                </a>
                <a href="/dashboard/settings" style={{background:'rgba(255,255,255,0.15)',color:'white',fontWeight:600,padding:'10px 20px',borderRadius:'10px',textDecoration:'none',fontSize:'14px'}}>
                  ⚙️ Atur Notifikasi
                </a>
              </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginTop:'20px'}}>
            {[['1️⃣','Buat pantauan','Pilih kategori & keyword'],['2️⃣','AI bekerja','Kami pindai internet'],['3️⃣','Dapat notif','Langsung ke email kamu']].map(([i,t,d])=>(
              <div key={t} style={{background:'rgba(255,255,255,0.1)',borderRadius:'10px',padding:'12px'}}>
                <div style={{fontSize:'20px',marginBottom:'4px'}}>{i}</div>
                <p style={{fontWeight:700,fontSize:'13px',margin:'0 0 2px'}}>{t}</p>
                <p style={{fontSize:'12px',opacity:0.75,margin:0}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Stats Chart */}
      {dashStats && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,480px),1fr))',gap:'16px',marginBottom:'24px'}}>
          {/* Chart bar 7 hari */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div>
                <h3 style={{fontWeight:700,fontSize:'15px',color:'#0D1B2A',margin:0}}>Notifikasi 7 Hari Terakhir</h3>
                <p style={{fontSize:'13px',color:'#9EB3C8',margin:'2px 0 0'}}>{dashStats.totalLast7} total · {dashStats.successRate}% terkirim</p>
              </div>
              <span style={{fontSize:'24px'}}>📊</span>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'80px'}}>
              {dashStats.chartData.map((d:any) => {
                const max = Math.max(...dashStats.chartData.map((x:any) => x.count), 1)
                const pct = max > 0 ? (d.count / max) * 100 : 0
                return (
                  <div key={d.date} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
                    <span style={{fontSize:'10px',color:'#9EB3C8',fontWeight:600}}>{d.count > 0 ? d.count : ''}</span>
                    <div style={{width:'100%',background:pct > 0 ? '#1560BD' : '#F1F5F9',borderRadius:'4px 4px 0 0',height:`${Math.max(pct, 4)}%`,transition:'height .3s',minHeight:'4px'}}/>
                    <span style={{fontSize:'9px',color:'#9EB3C8',textAlign:'center',lineHeight:1.2}}>{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {[
              {i:'🔔',v:dashStats.unreadCount,l:'Belum Dibaca',c:'#1560BD',bg:'#E8F0FB'},
              {i:'📡',v:dashStats.activeWatches,l:'Pantauan Aktif',c:'#0F6E56',bg:'#E1F5EE'},
              {i:'📅',v:dashStats.totalLast30,l:'Notif 30 Hari',c:'#7C3AED',bg:'#F3F0FF'},
              {i:'✅',v:`${dashStats.successRate}%`,l:'Sukses Terkirim',c:'#D97706',bg:'#FEF3C7'},
            ].map(({i,v,l,c,bg})=>(
              <div key={l} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'16px',display:'flex',flexDirection:'column',gap:'6px'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'10px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>{i}</div>
                <p style={{fontSize:'22px',fontWeight:800,color:'#0D1B2A',margin:0}}>{v}</p>
                <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {params.get('payment')==='success'&&<div style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:'14px',padding:'16px 20px',marginBottom:'24px',display:'flex',gap:'12px',alignItems:'center'}}><span style={{fontSize:'28px'}}>🎉</span><div><p style={{fontWeight:700,color:'#0F6E56',margin:0}}>Pembayaran Berhasil!</p><p style={{fontSize:'13px',color:'#0F6E56',margin:0}}>Plan kamu sudah diupgrade. Selamat menikmati!</p></div></div>}
      {!isPro&&<div style={{background:'linear-gradient(135deg,#1560BD,#0F6E56)',borderRadius:'16px',padding:'20px 24px',marginBottom:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',flexWrap:'wrap'}}>
        <div><p style={{color:'white',fontWeight:700,fontSize:'16px',marginBottom:'4px'}}>🚀 Upgrade ke Pro — Rp 49.000/bln</p><p style={{color:'rgba(255,255,255,0.8)',fontSize:'13px',margin:0}}>Unlimited queries, real-time, WA+Telegram+Email</p></div>
        <a href="/dashboard/upgrade" style={{background:'white',color:'#1560BD',fontWeight:700,padding:'10px 20px',borderRadius:'10px',textDecoration:'none',fontSize:'14px',whiteSpace:'nowrap'}}>Upgrade →</a>
      </div>}
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:800}}>Halo, {user?.name?.split(' ')[0]||'Pengguna'} 👋</h1>
        <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>Ringkasan aktivitas pantauanmu hari ini.</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px',marginBottom:'24px'}}>
        {[['Pantau.in Aktif',stats.watches,'🔍','/dashboard/watches'],['Notif Belum Dibaca',stats.unread,'🔔','/dashboard/notifications'],['Total Peluang',stats.total,'🎯','/dashboard/history'],['Plan Aktif', isPro && planExpiryStr ? (user?.plan + ' s/d ' + planExpiryStr) : (user?.plan||'FREE'),'⭐','/dashboard/upgrade']].map(([l,v,i,href])=>(
          <a key={String(l)} href={String(href)} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'18px',textDecoration:'none',display:'block'}}>
            <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>{l}</p>
            <p style={{fontSize:'28px',fontWeight:800,color:'#0D1B2A',margin:0}}>{String(i)} {String(v)}</p>
          </a>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px'}}>
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
          <h3 style={{fontWeight:700,marginBottom:'16px'}}>🚀 Mulai dari sini</h3>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {[{href:'/dashboard/watches',i:'🔍',t:'Buat pantau.in',d:'Mulai memantau peluang pertamamu'},{href:'/dashboard/settings',i:'⚙️',t:'Atur Notifikasi',d:'Pilih channel yang kamu sukai'},{href:'/dashboard/notifications',i:'🔔',t:'Lihat Notifikasi',d:'Peluang terbaru dari AI'},{href:'/dashboard/history',i:'📊',t:'Riwayat Peluang',d:'Semua peluang yang ditemukan'}].map(item=>(
              <a key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',border:'1px solid #DDE5EF',borderRadius:'12px',textDecoration:'none',color:'#0D1B2A'}}>
                <span style={{fontSize:'20px'}}>{item.i}</span>
                <div><p style={{fontWeight:600,fontSize:'14px',margin:0}}>{item.t}</p><p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>{item.d}</p></div>
                <span style={{marginLeft:'auto',color:'#9EB3C8'}}>→</span>
              </a>
            ))}
          </div>
        </div>
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
          <h3 style={{fontWeight:700,marginBottom:'16px'}}>📡 Kategori yang Bisa Dipantau</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:'8px'}}>
            {[['📋','Tender'],['🏠','Properti'],['🚗','Kendaraan'],['💼','Bisnis'],['📈','Investasi'],['👔','Lowongan'],['🎓','Beasiswa'],['🤝','Bantuan']].map(([i,l])=>(
              <a key={String(l)} href="/dashboard/watches" style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'#F8FAFC',borderRadius:'8px',textDecoration:'none',color:'#0D1B2A',fontSize:'13px',fontWeight:500}}>
                <span>{i}</span><span>{l}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={<div style={{padding:'48px',textAlign:'center',color:'#5A7090'}}>⏳ Memuat...</div>}><DashContent/></Suspense>
}
