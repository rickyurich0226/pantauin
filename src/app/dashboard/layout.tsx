'use client'
import React from 'react'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'

const MENU = [
  {href:'/dashboard',label:'Dashboard',icon:'🏠'},
  {href:'/dashboard/watches',label:'Pantau.in',icon:'🔍'},
  {href:'/dashboard/notifications',label:'Notifikasi',icon:'🔔'},
  {href:'/dashboard/history',label:'Riwayat',icon:'📊'},
  {href:'/dashboard/settings',label:'Pengaturan',icon:'⚙️'},
  {href:'/dashboard/referral',label:'Referral',icon:'🎁'},
  {href:'/dashboard/upgrade',label:'Upgrade Plan',icon:'⭐'},
]
const PLAN_S:Record<string,{bg:string;color:string}> = {
  FREE:{bg:'#F1F5F9',color:'#64748b'},PRO:{bg:'#E8F0FB',color:'#1560BD'},BUSINESS:{bg:'#E1F5EE',color:'#0F6E56'},
}

function NavStatus() {
  const [mon, setMon] = React.useState({totalScanned:0,lastFetch:'',loading:true})
  React.useEffect(()=>{
    fetch('/api/monitoring-status').then(r=>r.ok?r.json():null).then(d=>{
      if(d) setMon({totalScanned:d.totalScanned||0,lastFetch:d.lastFetch||'',loading:false})
      else setMon(m=>({...m,loading:false}))
    }).catch(()=>setMon(m=>({...m,loading:false})))
  },[])
  if(mon.loading) return null
  return (
    <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 12px',borderRadius:'8px',background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
      <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#10B981',display:'inline-block',flexShrink:0}}/>
      <span style={{fontSize:'12px',fontWeight:600,color:'#059669',whiteSpace:'nowrap'}}>Platform Aktif</span>
      <span style={{fontSize:'11px',color:'#6EE7B7'}}>·</span>
      <span style={{fontSize:'11px',color:'#059669',whiteSpace:'nowrap'}}>{mon.totalScanned.toLocaleString('id-ID')} terpindai</span>
      {mon.lastFetch&&<><span style={{fontSize:'11px',color:'#6EE7B7'}}>·</span><span style={{fontSize:'11px',color:'#059669',whiteSpace:'nowrap'}}>{mon.lastFetch}</span></>}
    </div>
  )
}

function Shell({children}:{children:React.ReactNode}) {
  const pathname = usePathname()
  const {data:session} = useSession()
  const [col, setCol] = useState(false)
  const user = session?.user as any
  const plan = user?.plan??'FREE'
  const role = user?.role??'USER'
  const initials = user?.name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()??'U'
  const ps = PLAN_S[plan]||PLAN_S.FREE

  const allMenu = [
    ...MENU,
    ...(role==='ADMIN'||role==='SUPER_ADMIN'?[{href:'/admin',label:'Admin Panel',icon:'🛡️'}]:[]),
    ...(role==='SUPER_ADMIN'?[{href:'/superadmin',label:'Super Admin',icon:'👑'}]:[]),
  ]

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'#F0F4F9'}}>
      <nav style={{height:'60px',background:'white',borderBottom:'1px solid #DDE5EF',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>setCol(!col)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#5A7090'}}>☰</button>
          <a href="/dashboard" style={{display:'flex',alignItems:'center',gap:'8px',textDecoration:'none'}}>
            <img src="/logo.png" alt="pantau.in" style={{height:"28px",objectFit:"contain"}}/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'18px',fontWeight:800,marginLeft:'8px'}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span>
          </a>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:ps.bg,color:ps.color}}>{plan}</span>
          <NavStatus/>
          <a href="/dashboard/notifications" style={{position:'relative',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'10px',background:'#F8FAFC',textDecoration:'none',fontSize:'18px'}}>🔔<span style={{position:'absolute',top:'5px',right:'5px',width:'8px',height:'8px',borderRadius:'50%',background:'#EF4444'}}/></a>
          <button onClick={()=>signOut({callbackUrl:'/'})} style={{background:'none',border:'1px solid #DDE5EF',borderRadius:'8px',padding:'6px 14px',cursor:'pointer',fontSize:'13px',color:'#5A7090'}}>Keluar</button>
        </div>
      </nav>
      <div style={{display:'flex',flex:1}}>
        <style>{`.dash-aside{position:sticky;top:60px;height:calc(100vh - 60px)}@media(max-width:768px){.dash-aside{position:fixed!important;left:0;top:60px;height:calc(100vh - 60px)!important;z-index:200;transform:translateX(-100%);transition:transform .25s!important;box-shadow:4px 0 20px rgba(0,0,0,0.15)}.dash-aside.open{transform:translateX(0)!important}.dash-overlay{display:block!important}.dash-main{width:100%!important}}.dash-overlay{display:none;position:fixed;inset:0;top:60px;background:rgba(0,0,0,0.3);z-index:199}`}</style>
        {col&&<div className="dash-overlay" onClick={()=>setCol(false)}/>}
        <aside className={"dash-aside"+(col?' open':'')} style={{width:'220px',background:'white',borderRight:'1px solid #DDE5EF',flexShrink:0,transition:'transform .25s',overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <nav style={{flex:1,padding:'12px 8px',overflowY:'auto'}}>
            {allMenu.map(item=>{
              const active=pathname===item.href||(item.href!=='/dashboard'&&pathname.startsWith(item.href))
              const isUp=item.href==='/dashboard/referral'||item.href==='/dashboard/upgrade'
              const isAdm=item.href==='/admin'||item.href==='/superadmin'
              return (
                <a key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 10px',borderRadius:'10px',marginBottom:'2px',textDecoration:'none',fontSize:'13px',fontWeight:active?700:500,
                  background:active?'#E8F0FB':isUp?'linear-gradient(90deg,#E8F0FB,#E1F5EE)':isAdm?'#EDE9FE':'transparent',
                  color:active?'#1560BD':isUp?'#1560BD':isAdm?'#7C3AED':'#5A7090',whiteSpace:'nowrap',overflow:'hidden',
                  border:isUp?'1px solid #C7D9F8':'1px solid transparent'}}>
                  <span style={{fontSize:'17px',flexShrink:0}}>{item.icon}</span>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>
                </a>
              )
            })}
          </nav>
          {(
            <div style={{padding:'12px',borderTop:'1px solid #DDE5EF'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px',borderRadius:'10px',background:'#F8FAFC'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#1560BD,#0F6E56)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'11px',fontWeight:700,flexShrink:0}}>{initials}</div>
                <div style={{minWidth:0}}><p style={{fontSize:'12px',fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</p><p style={{fontSize:'11px',color:'#9EB3C8',margin:0}}>{role}</p></div>
              </div>
            </div>
          )}
        </aside>
        <main className='dash-main' style={{flex:1,padding:'clamp(14px,2.5vw,28px)',minWidth:0,width:'100%',overflow:'hidden'}}>{children}</main>
      </div>
    </div>
  )
}

export default function DashboardLayout({children}:{children:React.ReactNode}) {
  return <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}><Shell>{children}</Shell></SessionProvider>
}
