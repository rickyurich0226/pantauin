'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ConfirmModal'

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as any
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<{open:boolean,title:string,message:string,onConfirm:()=>void,color?:string}>({open:false,title:'',message:'',onConfirm:()=>{}})

  useEffect(()=>{
    if(session&&!['ADMIN','SUPER_ADMIN'].includes(user?.role)){router.push('/dashboard');return}
    fetchUsers()
    fetchStats()
  },[session])

  const fetchUsers = async(q='',plan='ALL')=>{
    setLoading(true)
    const params = new URLSearchParams({limit:'50'})
    if(q) params.set('q',q)
    if(plan!=='ALL') params.set('plan',plan)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    if(data.users) setUsers(data.users)
    setLoading(false)
  }

  const fetchStats = async()=>{
    const res = await fetch('/api/admin/stats')
    const data = await res.json()
    setStats(data)
  }

  const toggleUser = (userId:string,isActive:boolean)=>{
    setConfirmModal({open:true,title:isActive?'Suspend User':'Aktifkan User',message:`Yakin ingin ${isActive?'suspend':'aktifkan'} user ini?`,color:isActive?'#EF4444':'#0F6E56',onConfirm:async()=>{
    setConfirmModal(m=>({...m,open:false}))
    await fetch('/api/admin/users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action:'TOGGLE_ACTIVE'})})
    fetchUsers(search,filterPlan)
    }})
  }

  const updatePlan = (userId:string, plan:string, currentPlan:string)=>{
    setConfirmModal({open:true,title:'Ubah Plan',message:`Ubah plan dari ${currentPlan} ke ${plan}?`,color:'#1560BD',onConfirm:async()=>{
    setConfirmModal(m=>({...m,open:false}))
    await fetch('/api/admin/users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action:'CHANGE_PLAN',value:plan})})
    fetchUsers(search,filterPlan)
    }})
  }

  const updateRole = (userId:string, role:string)=>{
    setConfirmModal({open:true,title:'Ubah Role',message:`Ubah role user ini menjadi ${role}?`,color:'#7C3AED',onConfirm:async()=>{
    setConfirmModal(m=>({...m,open:false}))
    await fetch('/api/admin/users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action:'CHANGE_ROLE',value:role})})
    fetchUsers(search,filterPlan)
    }})
  }

  const handleSearch = (e:React.FormEvent)=>{ e.preventDefault(); fetchUsers(search,filterPlan) }

  const fmtDate = (d:string)=>d?new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-'
  const CHANNEL_LABEL:Record<string,string> = {EMAIL:'Email',WHATSAPP:'WhatsApp',TELEGRAM:'Telegram',PUSH:'Push'}
  const PLAN_COLORS: Record<string,string> = {FREE:'#64748b',PRO:'#1560BD',BUSINESS:'#0F6E56'}
  const PLAN_BG: Record<string,string> = {FREE:'#F1F5F9',PRO:'#E8F0FB',BUSINESS:'#E1F5EE'}

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:800}}>Admin Panel</h1>
        <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>Kelola pengguna dan pantau kesehatan platform.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px',marginBottom:'28px'}}>
        {[
          ['Total Pengguna',stats.totalUsers||0,'👥'],['Pengguna Aktif',stats.activeUsers||0,'✅'],
          ['Plan Pro+',stats.paidUsers||0,'⭐'],['Watch Queries',stats.totalWatches||0,'🔍'],
          ['Notif Terkirim',stats.totalNotifs||0,'🔔'],['Scraper Aktif',stats.activeScrapers||48,'🤖'],
        ].map(([l,v,i])=>(
          <div key={String(l)} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'18px'}}>
            <p style={{fontSize:'12px',fontWeight:600,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px'}}>{l}</p>
            <p style={{fontSize:'26px',fontWeight:800}}>{String(i)} {String(v)}</p>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'4px',background:'#F8FAFC',borderRadius:'12px',padding:'4px',marginBottom:'20px',width:'fit-content'}}>
        {[{k:'users',l:'👥 Pengguna'},{k:'scrapers',l:'🤖 Scrapers'},{k:'notifications',l:'🔔 Notifikasi'}].map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)}
            style={{padding:'8px 16px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,
              background:activeTab===t.k?'white':'transparent',color:activeTab===t.k?'#1560BD':'#5A7090'}}>
            {t.l}
          </button>
        ))}
      </div>

      {activeTab==='users'&&(
        <>
          <form onSubmit={handleSearch} style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari nama atau email..."
              style={{flex:1,minWidth:'200px',padding:'10px 14px',border:'1.5px solid #DDE5EF',borderRadius:'10px',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
            <select value={filterPlan} onChange={e=>{setFilterPlan(e.target.value);fetchUsers(search,e.target.value)}}
              style={{padding:'10px 14px',border:'1.5px solid #DDE5EF',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white'}}>
              <option value="ALL">Semua Plan</option>
              <option value="FREE">Free</option><option value="PRO">Pro</option><option value="BUSINESS">Business</option>
            </select>
            <button type="submit" style={{padding:'10px 20px',background:'#1560BD',color:'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>Cari</button>
          </form>

          {loading?<div style={{textAlign:'center',padding:'48px',color:'#5A7090'}}>⏳ Memuat data pengguna...</div>:(
            <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#F8FAFC'}}>
                    {['Pengguna','Plan','Role','Status','Notif','Bergabung','Historis','Aksi'].map(h=>(
                      <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid #DDE5EF'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u,i)=>(
                    <tr key={u.id}
                      onClick={()=>setSelectedUser(u)}
                      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#F8FAFC'}
                      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}
                      style={{borderBottom:i<users.length-1?'1px solid #F1F5F9':'none',cursor:'pointer'}}>
                      <td style={{padding:'14px 16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#1560BD,#0F6E56)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'12px',fontWeight:700,flexShrink:0}}>
                            {u.name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{fontWeight:600,fontSize:'14px',margin:0}}>{u.name}</p>
                            <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>{u.email}</p>
                            {u.registrationIp&&<p style={{fontSize:'11px',color:'#9EB3C8',margin:'2px 0 0'}}>🌐 Reg: {u.registrationIp}</p>}
                            {u.lastLoginAt&&<p style={{fontSize:'11px',color:'#5A7090',margin:'2px 0 0'}}>🕐 Login: {new Date(u.lastLoginAt).toLocaleDateString('id-ID')} {new Date(u.lastLoginAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}{u.lastLoginIp?' · '+u.lastLoginIp:''}</p>}
                            <p style={{fontSize:'11px',color:'#5A7090',margin:'2px 0 0'}}>🔍 {u._count?.watches||0} pantauan · 🔔 {u._count?.notifications||0} notif</p>
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'14px 16px'}} onClick={e=>e.stopPropagation()}>
                        <select value={u.plan} onChange={e=>updatePlan(u.id,e.target.value,u.plan)}
                          style={{fontSize:'12px',fontWeight:700,padding:'4px 8px',borderRadius:'8px',border:'1.5px solid #DDE5EF',background:PLAN_BG[u.plan]||'#F1F5F9',color:PLAN_COLORS[u.plan]||'#64748b',cursor:'pointer',outline:'none'}}>
                          <option value="FREE">FREE</option>
                          <option value="PRO">PRO</option>
                          <option value="BUSINESS">BUSINESS</option>
                        </select>
                      </td>
                      <td style={{padding:'14px 16px'}} onClick={e=>e.stopPropagation()}>
                        <select value={u.role} onChange={e=>updateRole(u.id,e.target.value)}
                          style={{fontSize:'12px',fontWeight:700,padding:'4px 8px',borderRadius:'8px',border:'1.5px solid #DDE5EF',background:u.role==='SUPER_ADMIN'?'#1E293B':u.role==='ADMIN'?'#EDE9FE':'#F1F5F9',color:u.role==='SUPER_ADMIN'?'#E2E8F0':u.role==='ADMIN'?'#6D28D9':'#64748b',cursor:'pointer',outline:'none'}}>
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                      <td style={{padding:'14px 16px'}}>
                        <span style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'13px',color:u.isActive?'#0F6E56':'#EF4444'}}>
                          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:u.isActive?'#10B981':'#EF4444',display:'inline-block'}}/>
                          {u.isActive?'Aktif':'Suspended'}
                        </span>
                      </td>
                      <td style={{padding:'14px 16px',textAlign:'center'}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                          <span style={{fontSize:'16px',fontWeight:800,color:u._count?.notifications>0?'#1560BD':'#9EB3C8'}}>{u._count?.notifications||0}</span>
                          <span style={{fontSize:'10px',color:'#9EB3C8'}}>notif</span>
                        </div>
                      </td>
                      <td style={{padding:'14px 16px',fontSize:'12px',color:'#9EB3C8'}}>{new Date(u.createdAt).toLocaleDateString('id-ID')+' '+new Date(u.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</td>
                      <td style={{padding:'14px 16px'}}>
                        <div style={{fontSize:'11px',color:'#9EB3C8'}}>
                          {u.updatedAt&&u.updatedAt!==u.createdAt?<><span style={{color:'#5A7090',fontWeight:600}}>Diubah:</span><br/>{new Date(u.updatedAt).toLocaleDateString('id-ID')} {new Date(u.updatedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</>:<span>—</span>}
                        </div>
                      </td>
                      <td style={{padding:'14px 16px'}} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>toggleUser(u.id,u.isActive)}
                          style={{padding:'6px 14px',border:'1px solid',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:600,
                            borderColor:u.isActive?'#FEE2E2':'#DCFCE7',background:'white',color:u.isActive?'#EF4444':'#0F6E56'}}>
                          {u.isActive?'Suspend':'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length===0&&<div style={{padding:'48px',textAlign:'center',color:'#5A7090'}}>Tidak ada pengguna ditemukan</div>}
            </div>
          )}
        </>
      )}

      {activeTab==='scrapers'&&(
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#F8FAFC'}}>
                {['Sumber','Kategori','Interval','Status','Item/Run','Aksi'].map(h=>(
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',borderBottom:'1px solid #DDE5EF'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {name:'LPSE Nasional',cat:'TENDER',interval:'5 mnt',status:'active',items:8},
                {name:'LPSE Jabar',cat:'TENDER',interval:'5 mnt',status:'active',items:3},
                {name:'Tokopedia',cat:'BARANG',interval:'10 mnt',status:'active',items:124},
                {name:'OLX',cat:'KENDARAAN',interval:'10 mnt',status:'active',items:47},
                {name:'Rumah123',cat:'PROPERTI',interval:'15 mnt',status:'active',items:12},
                {name:'Carmudi',cat:'KENDARAAN',interval:'15 mnt',status:'failed',items:0},
              ].map((s,i,arr)=>(
                <tr key={s.name} style={{borderBottom:i<arr.length-1?'1px solid #F1F5F9':'none'}}>
                  <td style={{padding:'14px 16px',fontWeight:600,fontSize:'14px'}}>{s.name}</td>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:'#5A7090'}}>{s.cat}</td>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:'#5A7090'}}>{s.interval}</td>
                  <td style={{padding:'14px 16px'}}>
                    <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:s.status==='active'?'#DCFCE7':'#FEE2E2',color:s.status==='active'?'#166534':'#991B1B'}}>{s.status}</span>
                  </td>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:s.items>0?'#0F6E56':'#9EB3C8',fontWeight:s.items>0?700:400}}>{s.items||'—'}</td>
                  <td style={{padding:'14px 16px'}}>
                    <button style={{padding:'6px 14px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>Run</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab==='notifications'&&(
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px',textAlign:'center'}}>
          <p style={{fontSize:'14px',color:'#5A7090'}}>Log notifikasi platform akan tampil di sini.</p>
        </div>
      )}

      {selectedUser&&(
        <div onClick={()=>setSelectedUser(null)} style={{position:'fixed',inset:0,background:'rgba(15,30,60,0.5)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'20px',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
            <div style={{background:'linear-gradient(135deg,#1560BD,#0F6E56)',borderRadius:'20px 20px 0 0',padding:'24px',color:'white',position:'relative'}}>
              <button onClick={()=>setSelectedUser(null)} style={{position:'absolute',top:'16px',right:'16px',background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',color:'white',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
              <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:800,flexShrink:0}}>
                  {selectedUser.name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p style={{fontWeight:800,fontSize:'18px',margin:0}}>{selectedUser.name}</p>
                  <p style={{fontSize:'13px',opacity:0.85,margin:'2px 0 0'}}>{selectedUser.email}</p>
                  <div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'100px',background:'rgba(255,255,255,0.25)'}}>{selectedUser.plan}</span>
                    <span style={{fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'100px',background:'rgba(255,255,255,0.25)'}}>{selectedUser.role}</span>
                    <span style={{fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'100px',background:selectedUser.isActive?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)'}}>
                      {selectedUser.isActive?'Aktif':'Suspended'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:'14px'}}>
              <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px'}}>
                <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 12px'}}>Informasi Kontak</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div>
                    <p style={{fontSize:'11px',color:'#9EB3C8',margin:'0 0 3px'}}>Email</p>
                    <p style={{fontSize:'13px',fontWeight:600,margin:0,wordBreak:'break-all'}}>{selectedUser.email}</p>
                  </div>
                  <div>
                    <p style={{fontSize:'11px',color:'#9EB3C8',margin:'0 0 3px'}}>No. Telepon</p>
                    <p style={{fontSize:'13px',fontWeight:600,margin:0,color:selectedUser.phone?'#1E293B':'#9EB3C8'}}>{selectedUser.phone||'belum diisi'}</p>
                  </div>
                </div>
              </div>
              <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px'}}>
                <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 12px'}}>Channel Notifikasi</p>
                {selectedUser.notifChannels?.length>0?(
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    {selectedUser.notifChannels.map((ch:string)=>(
                      <span key={ch} style={{fontSize:'12px',fontWeight:600,padding:'4px 14px',borderRadius:'100px',background:'#E8F0FB',color:'#1560BD'}}>{CHANNEL_LABEL[ch]||ch}</span>
                    ))}
                  </div>
                ):(
                  <p style={{fontSize:'13px',color:'#9EB3C8',margin:0}}>belum ada channel aktif</p>
                )}
              </div>
              <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px'}}>
                <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 12px'}}>Aktivitas</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div style={{background:'white',borderRadius:'8px',padding:'12px',textAlign:'center',border:'1px solid #DDE5EF'}}>
                    <p style={{fontSize:'22px',fontWeight:800,color:'#1560BD',margin:0}}>{selectedUser._count?.watches||0}</p>
                    <p style={{fontSize:'11px',color:'#9EB3C8',margin:'4px 0 0'}}>Pantauan</p>
                  </div>
                  <div style={{background:'white',borderRadius:'8px',padding:'12px',textAlign:'center',border:'1px solid #DDE5EF'}}>
                    <p style={{fontSize:'22px',fontWeight:800,color:'#0F6E56',margin:0}}>{selectedUser._count?.notifications||0}</p>
                    <p style={{fontSize:'11px',color:'#9EB3C8',margin:'4px 0 0'}}>Notifikasi</p>
                  </div>
                </div>
              </div>
              <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px'}}>
                <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 12px'}}>Info Akun</p>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'12px',color:'#9EB3C8'}}>Bergabung</span>
                    <span style={{fontSize:'12px',fontWeight:600}}>{fmtDate(selectedUser.createdAt)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'12px',color:'#9EB3C8'}}>Login Terakhir</span>
                    <span style={{fontSize:'12px',fontWeight:600}}>{fmtDate(selectedUser.lastLoginAt)}</span>
                  </div>
                  {selectedUser.lastLoginIp&&(
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'12px',color:'#9EB3C8'}}>IP Login Terakhir</span>
                      <span style={{fontSize:'12px',fontWeight:600,fontFamily:'monospace'}}>{selectedUser.lastLoginIp}</span>
                    </div>
                  )}
                  {selectedUser.registrationIp&&(
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'12px',color:'#9EB3C8'}}>IP Registrasi</span>
                      <span style={{fontSize:'12px',fontWeight:600,fontFamily:'monospace'}}>{selectedUser.registrationIp}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'12px 16px'}}>
                <p style={{fontSize:'11px',color:'#9EB3C8',margin:'0 0 3px'}}>User ID</p>
                <p style={{fontSize:'12px',fontFamily:'monospace',color:'#5A7090',margin:0,wordBreak:'break-all'}}>{selectedUser.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}


      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} confirmColor={confirmModal.color} onConfirm={confirmModal.onConfirm} onCancel={()=>setConfirmModal(m=>({...m,open:false}))}/>
    </div>
  )
}