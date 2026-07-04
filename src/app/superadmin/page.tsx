'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SuperAdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as any
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [saved, setSaved] = useState('')
  const [msg, setMsg] = useState<{type:'ok'|'err',text:string}|null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [sources, setSources] = useState<any[]>([])
  const [revenue, setRevenue] = useState<any>({ totalRevenue: 0, mrr: 0, monthlyTrend: [], planDistribution: [], recentTransactions: [] })
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [engagement, setEngagement] = useState<any>({ feedback: {} })
  const [newSource, setNewSource] = useState({ source: '', category: 'TENDER', url: '', type: 'RSS', intervalMinutes: 30 })
  const [lastRefresh, setLastRefresh] = useState<Date|null>(null)
  const [savingSource, setSavingSource] = useState(false)

  // Integration config state
  const [integrations, setIntegrations] = useState({
    openai_key: '', wa_phone_id: '', wa_token: '',
    telegram_token: '', midtrans_server_key: '', midtrans_client_key: '',
    midtrans_is_production: false,
    smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '',
    recaptcha_site_key: '', recaptcha_secret_key: '',
  })

  // Platform config
  const [config, setConfig] = useState({
    site_name: 'Pantau.in', site_tagline: 'Internet Dipantau. Peluang Dikirim ke WA Kamu.',
    contact_email: 'pantau.inofficial@gmail.com', contact_wa: 'https://wa.me/6287890144122',
    contact_wa_label: '@pantauin', telegram_channel: 'https://t.me/pantauin',
    free_max_watches: 3, free_max_notifs: 30, match_threshold: 0.72,
    maintenance_mode: false, allow_registration: true,
  })

  // Legal content
  const [legal, setLegal] = useState({
    terms: 'Syarat dan Ketentuan Pantau.in...',
    privacy: 'Kebijakan Privasi Pantau.in...',
    about: 'Tentang Pantau.in...',
  })

  // Referral config
  const [referral, setReferral] = useState({
    referral_enabled: true,
    referral_reward_referrer_days: 7,
    referral_reward_referee_days: 7,
    referral_reward_on_upgrade_days: 30,
    referral_discount_pro: 10,
    referral_discount_biz: 15,
  })

  // Pricing
  const [plans, setPlans] = useState({
    pro_monthly: 49000, pro_yearly: 470000,
    biz_monthly: 149000, biz_yearly: 1430000,
  })

  useEffect(()=>{
    if(session&&user?.role!=='SUPER_ADMIN'){router.push('/dashboard');return}
    fetchStats()
    fetchUsers()
    fetchSources()
    fetchRevenue()
    fetchAuditLogs()
    fetchConfig()
  },[session])

  useEffect(()=>{
    if(activeTab!=='sources') return
    const interval = setInterval(()=>{
      fetch('/api/superadmin/sources').then(r=>r.json()).then(d=>{ if(d.sources){ setSources(d.sources); setLastRefresh(new Date()) } })
    }, 30000)
    return ()=>clearInterval(interval)
  }, [activeTab])

  const fetchConfig = async()=>{
    const res = await fetch('/api/superadmin/content')
    const d = await res.json()
    if(d.site_name!==undefined) setConfig(c=>({...c,...d}))
    if(d.match_threshold!==undefined) setConfig(c=>({...c,match_threshold:d.match_threshold,free_max_watches:d.free_max_watches,free_max_notifs:d.free_max_notifs}))
    if(d.referral_enabled!==undefined) setReferral(r=>({...r,referral_enabled:d.referral_enabled,referral_reward_referrer_days:d.referral_reward_referrer_days??7,referral_reward_referee_days:d.referral_reward_referee_days??7,referral_reward_on_upgrade_days:d.referral_reward_on_upgrade_days??30,referral_discount_pro:d.referral_discount_pro??10,referral_discount_biz:d.referral_discount_biz??15}))
  }
  const fetchSources = async()=>{
    const res = await fetch('/api/superadmin/sources')
    const data = await res.json()
    if(data.sources) setSources(data.sources)
  }

  const fetchRevenue = async()=>{
    const res = await fetch('/api/admin/revenue')
    const data = await res.json()
    if(res.ok) setRevenue(data)
  }

  const fetchAuditLogs = async()=>{
    const res = await fetch('/api/admin/audit-log')
    const data = await res.json()
    if(data.logs) setAuditLogs(data.logs)
  }

  const addSource = async()=>{
    if(!newSource.source.trim()||!newSource.url.trim()) return showMsg('err','Nama dan URL wajib diisi')
    setSavingSource(true)
    const res = await fetch('/api/superadmin/sources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newSource)})
    const data = await res.json()
    setSavingSource(false)
    if(!res.ok) return showMsg('err',data.error||'Gagal menambah sumber')
    showMsg('ok','✅ Sumber monitoring ditambahkan')
    setNewSource({source:'',category:'TENDER',url:'',type:'RSS',intervalMinutes:30})
    fetchSources()
  }

  const toggleSource = async(id:string, isActive:boolean)=>{
    await fetch('/api/superadmin/sources',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,isActive:!isActive})})
    fetchSources()
  }

  const deleteSource = async(id:string)=>{
    if(!confirm('Hapus sumber monitoring ini?')) return
    await fetch('/api/superadmin/sources',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    fetchSources()
  }

  const fetchStats = async()=>{
    const res = await fetch('/api/admin/stats')
    fetch('/api/admin/engagement').then(r=>r.json()).then(d=>setEngagement(d)).catch(()=>{})
    const data = await res.json()
    setStats(data)
  }

  const fetchUsers = async()=>{
    const res = await fetch('/api/admin/users?limit=100')
    const data = await res.json()
    if(data.users) setUsers(data.users)
  }

  const showMsg = (type:'ok'|'err', text:string) => {
    setMsg({type,text})
    setTimeout(()=>setMsg(null),5000)
  }

  const saveSection = async(section:string)=>{
    setSaving(true)
    const payload = section==='content'?{...config,...legal}:section==='pricing'?plans:config
    try {
      const res = await fetch('/api/superadmin/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const data = await res.json()
      setSaving(false)
      if(res.ok && data.success) {
        setSaved(section)
        setTimeout(()=>setSaved(''),2500)
        // Reload config dari server agar form tampil nilai terbaru
        fetch('/api/superadmin/content').then(r=>r.json()).then(d=>{
          if(d.site_name!==undefined) setConfig(d)
          if(d.footer_fitur!==undefined) setConfig(d)
        })
        showMsg('ok','✅ Konfigurasi berhasil disimpan!')
      } else {
        showMsg('err','❌ Gagal menyimpan: '+(data.error||'Unknown error'))
      }
    } catch(e) {
      setSaving(false)
      showMsg('err','❌ Koneksi gagal. Coba lagi.')
    }
  }

  const applyToServer = async() => {
        if(!confirm('Terapkan konfigurasi ke server? Server akan di-restart otomatis (±10 detik).')) return
    setApplying(true)
    try {
      const res = await fetch('/api/superadmin/apply-config',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(integrations)
      })
      const data = await res.json()
      if(res.ok) showMsg('ok','✅ '+data.message)
      else showMsg('err','❌ '+data.error)
    } catch {
      showMsg('err','❌ Gagal terhubung ke server')
    }
    setApplying(false)
  }
  const changePlan = async(userId:string, plan:string)=>{
    await fetch('/api/admin/users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action:'CHANGE_PLAN',value:plan})})
    fetchUsers()
  }

  const TABS = [
    {k:'overview',l:'📊 Overview'},{k:'revenue',l:'💰 Revenue'},
    {k:'users',l:'👥 Semua User'},{k:'sources',l:'📡 Sumber Monitoring'},
    {k:'pricing',l:'💳 Harga & Plan'},
    {k:'engagement',l:'📈 Engagement'},
    {k:'config',l:'⚙️ Konfigurasi'},{k:'content',l:'📝 Konten'},
    {k:'integrations',l:'🔌 Integrasi'},{k:'audit',l:'📋 Audit Log'},
  ]

  const inp={width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'8px',fontSize:'14px',outline:'none',fontFamily:'inherit',background:'white'} as React.CSSProperties
  const PLAN_BG: Record<string,string> = {FREE:'#F1F5F9',PRO:'#E8F0FB',BUSINESS:'#E1F5EE'}
  const PLAN_COLOR: Record<string,string> = {FREE:'#64748b',PRO:'#1560BD',BUSINESS:'#0F6E56'}

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'4px'}}>
          <h1 style={{fontSize:'24px',fontWeight:800}}>Super Admin 👑</h1>
          <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'#1E293B',color:'#E2E8F0'}}>FULL ACCESS</span>
        </div>
        <p style={{color:'#5A7090',fontSize:'14px'}}>Kendali penuh platform Pantau.in.</p>
      </div>

      {msg&&(
        <div style={{
          position:'sticky',top:'16px',zIndex:9999,
          background:msg.type==='ok'?'#0F6E56':'#991B1B',
          color:'white',padding:'16px 24px',borderRadius:'14px',
          fontSize:'14px',fontWeight:600,
          boxShadow:'0 8px 32px rgba(0,0,0,0.25)',
          display:'flex',alignItems:'center',gap:'12px',
          marginBottom:'16px',animation:'slideIn .2s ease'
        }}>
          <span style={{fontSize:'20px'}}>{msg.type==='ok'?'✅':'❌'}</span>
          <span style={{flex:1}}>{msg.text}</span>
          <button onClick={()=>setMsg(null)} style={{background:'rgba(255,255,255,0.25)',border:'none',color:'white',borderRadius:'6px',width:'28px',height:'28px',cursor:'pointer',fontSize:'16px',fontWeight:700}}>✕</button>
        </div>
      )}
      <style>{`@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'24px'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)}
            style={{padding:'8px 14px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,
              background:activeTab===t.k?'#1560BD':'#F8FAFC',color:activeTab===t.k?'white':'#5A7090'}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ENGAGEMENT */}
      {activeTab==='engagement'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'16px',marginBottom:'24px'}}>
            {[
              ['Total User', engagement.totalUsers||0, '👥'],
              ['Bikin Pantauan', (engagement.usersWithWatch||0)+' ('+(engagement.watchActivationRate||0)+'%)', '✅'],
              ['Belum Bikin Pantauan', engagement.usersWithoutWatch||0, '⚠️'],
              ['Login 7 Hari', engagement.usersLoggedIn7d||0, '🔓'],
              ['Notif 7 Hari', engagement.totalNotifs7d||0, '🔔'],
              ['Tingkat Feedback', (engagement.feedback?.feedbackRate||0)+'%', '💬'],
            ].map(([l,v,i])=>(
              <div key={String(l)} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'18px'}}>
                <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>{l}</p>
                <p style={{fontSize:'22px',fontWeight:800,margin:0}}>{String(i)} {String(v)}</p>
              </div>
            ))}
          </div>

          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px',marginBottom:'24px'}}>
            <h3 style={{fontWeight:700,margin:'0 0 16px'}}>Kualitas Notifikasi (Feedback User)</h3>
            {(engagement.feedback?.total||0) === 0 ? (
              <p style={{color:'#9EB3C8',fontSize:'13px'}}>Belum ada feedback dari user. Tunggu user menggunakan tombol 👍/👎 di halaman notifikasi.</p>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'16px'}}>
                <div style={{background:'#E1F5EE',borderRadius:'12px',padding:'14px'}}>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#0F6E56',marginBottom:'4px'}}>👍 RELEVAN</p>
                  <p style={{fontSize:'24px',fontWeight:800,color:'#0F6E56',margin:0}}>{engagement.feedback?.relevant||0}</p>
                </div>
                <div style={{background:'#FEF2F2',borderRadius:'12px',padding:'14px'}}>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#EF4444',marginBottom:'4px'}}>👎 TIDAK RELEVAN</p>
                  <p style={{fontSize:'24px',fontWeight:800,color:'#EF4444',margin:0}}>{engagement.feedback?.notRelevant||0}</p>
                </div>
                <div style={{background:engagement.feedback?.relevanceRate>=70?'#E1F5EE':engagement.feedback?.relevanceRate>=40?'#FFF8E1':'#FEF2F2',borderRadius:'12px',padding:'14px'}}>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',marginBottom:'4px'}}>TINGKAT RELEVANSI</p>
                  <p style={{fontSize:'24px',fontWeight:800,margin:0}}>{engagement.feedback?.relevanceRate}%</p>
                </div>
              </div>
            )}
          </div>

          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px'}}>
            <h3 style={{fontWeight:700,margin:'0 0 16px'}}>Notifikasi Ditandai "Tidak Relevan" (15 Terbaru)</h3>
            {(!engagement.recentNotRelevant || engagement.recentNotRelevant.length===0) ? (
              <p style={{color:'#9EB3C8',fontSize:'13px'}}>Tidak ada notifikasi yang ditandai tidak relevan. Bagus!</p>
            ) : (
              <div style={{display:'grid',gap:'10px'}}>
                {engagement.recentNotRelevant.map((n:any,idx:number)=>(
                  <div key={idx} style={{border:'1px solid #FEE2E2',borderRadius:'10px',padding:'12px 14px',background:'#FFFBFB'}}>
                    <p style={{fontSize:'13px',fontWeight:600,color:'#0D1B2A',margin:'0 0 6px'}}>{n.title}</p>
                    <div style={{display:'flex',gap:'12px',flexWrap:'wrap',fontSize:'11px',color:'#9EB3C8'}}>
                      <span>Watch: <strong>{n.watch?.name||n.watch?.queryText}</strong></span>
                      <span>Kategori: {n.watch?.category}</span>
                      <span>Score: {n.matchScore?n.matchScore.toFixed(2):'-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OVERVIEW */}
      {activeTab==='overview'&&(

        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px',marginBottom:'24px'}}>
            {[['Total Revenue','Rp '+(revenue.totalRevenue||0).toLocaleString('id-ID'),'💰'],['MRR','Rp '+(revenue.mrr||0).toLocaleString('id-ID'),'📈'],
              ['Total User',stats.totalUsers||0,'👥'],['Berbayar',stats.paidUsers||0,'⭐'],
              ['Watch Aktif',stats.totalWatches||0,'🔍'],['Sumber Aktif',sources.filter(s=>s.isActive).length,'📡']
            ].map(([l,v,i])=>(
              <div key={String(l)} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'18px'}}>
                <p style={{fontSize:'11px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>{l}</p>
                <p style={{fontSize:'22px',fontWeight:800,margin:0}}>{String(i)} {String(v)}</p>
              </div>
            ))}
          </div>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
              <h3 style={{fontWeight:700,margin:0}}>Status Sistem</h3>
              <span style={{fontSize:'12px',color:'#0F6E56',fontWeight:600}}>● Semua sistem normal</span>
            </div>
            {[['API Gateway','99.99%','45ms'],['App Server (Docker)','99.91%','—'],
              ['PostgreSQL','100%','12ms'],['Nginx Proxy','100%','<1ms'],
              ['Midtrans','99.9%','—']].map(([name,up,rt])=>(
              <div key={String(name)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',background:'#F8FAFC',borderRadius:'10px',marginBottom:'8px'}}>
                <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#10B981',flexShrink:0}}/>
                <span style={{flex:1,fontSize:'14px',fontWeight:500}}>{name}</span>
                <span style={{fontSize:'12px',color:'#5A7090'}}>Uptime: {up}</span>
                {rt!=='—'&&<span style={{fontSize:'12px',color:'#9EB3C8'}}>{rt}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVENUE */}
      {activeTab==='revenue'&&(
        <div>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
            <h3 style={{fontWeight:700,marginBottom:'20px'}}>Revenue Trend (12 Bulan)</h3>
            <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'160px'}}>
              {(revenue.monthlyTrend?.length?revenue.monthlyTrend:[0,0,0,0,0,0,0,0,0,0,0,0]).map((h:number,i:number)=>{
                const max=Math.max(...(revenue.monthlyTrend?.length?revenue.monthlyTrend:[1]),1)
                return <div key={i} title={'Rp '+h.toLocaleString('id-ID')} style={{flex:1,borderRadius:'4px 4px 0 0',background:'linear-gradient(180deg,#1560BD,#0F6E56)',height:`${Math.max((h/max)*100,2)}%`,cursor:'pointer',opacity:0.8}}/>
              })}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#9EB3C8',marginTop:'8px'}}>
              <span>12 bulan lalu</span><span>Sekarang</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'16px'}}>
            <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px'}}>
              <h3 style={{fontWeight:700,marginBottom:'16px'}}>Distribusi Plan</h3>
              {(revenue.planDistribution?.length?revenue.planDistribution:[]).map((p:any)=>(
                <div key={p.plan} style={{marginBottom:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                    <span style={{fontWeight:600}}>{p.plan}</span><span style={{color:'#5A7090'}}>{p.count} user</span>
                  </div>
                  <div style={{height:'6px',background:'#F1F5F9',borderRadius:'100px',overflow:'hidden'}}>
                    <div style={{height:'100%',background:PLAN_COLOR[p.plan]||'#94A3B8',borderRadius:'100px',width:`${p.pct}%`}}/>
                  </div>
                </div>
              ))}
              {!revenue.planDistribution?.length&&<p style={{fontSize:'13px',color:'#9EB3C8'}}>Belum ada user.</p>}
            </div>
            <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px'}}>
              <h3 style={{fontWeight:700,marginBottom:'16px'}}>Transaksi Terbaru</h3>
              {(revenue.recentTransactions?.length?revenue.recentTransactions:[]).map((t:any,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid #F1F5F9'}}>
                  <div style={{flex:1}}>
                    <p style={{fontSize:'13px',fontWeight:600,margin:0}}>{t.name}</p>
                    <p style={{fontSize:'11px',color:'#9EB3C8',margin:0}}>{t.plan}</p>
                  </div>
                  <span style={{fontSize:'13px',fontWeight:700,color:'#0F6E56'}}>Rp {Number(t.amount).toLocaleString('id-ID')}</span>
                  <span style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',
                    background:t.status==='SUCCESS'?'#DCFCE7':t.status==='PENDING'?'#FEF3C7':'#FEE2E2',color:t.status==='SUCCESS'?'#166534':t.status==='PENDING'?'#92400E':'#991B1B'}}>{t.status}</span>
                </div>
              ))}
              {!revenue.recentTransactions?.length&&<p style={{fontSize:'13px',color:'#9EB3C8'}}>Belum ada transaksi.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ALL USERS */}
      {activeTab==='users'&&(
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #DDE5EF'}}>
            <h3 style={{fontWeight:700,margin:0}}>Semua Pengguna ({users.length})</h3>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['Pengguna','Plan','Role','Status','Ubah Plan','Bergabung'].map(h=>(
                    <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',borderBottom:'1px solid #DDE5EF',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i)=>(
                  <tr key={u.id} style={{borderBottom:i<users.length-1?'1px solid #F1F5F9':'none'}}>
                    <td style={{padding:'12px 16px'}}>
                      <p style={{fontWeight:600,fontSize:'14px',margin:0}}>{u.name}</p>
                      <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>{u.email}</p>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:PLAN_BG[u.plan]||'#F1F5F9',color:PLAN_COLOR[u.plan]||'#64748b'}}>{u.plan}</span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',
                        background:u.role==='SUPER_ADMIN'?'#1E293B':u.role==='ADMIN'?'#EDE9FE':'#F1F5F9',
                        color:u.role==='SUPER_ADMIN'?'#E2E8F0':u.role==='ADMIN'?'#6D28D9':'#64748b'}}>{u.role}</span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'13px',color:u.isActive?'#0F6E56':'#EF4444'}}>
                        <span style={{width:'6px',height:'6px',borderRadius:'50%',background:u.isActive?'#10B981':'#EF4444',display:'inline-block'}}/>
                        {u.isActive?'Aktif':'Suspended'}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      {u.role==='SUPER_ADMIN'?<span style={{fontSize:'12px',color:'#9EB3C8'}}>Protected</span>:(
                        <select defaultValue={u.plan} onChange={e=>changePlan(u.id,e.target.value)}
                          style={{padding:'5px 10px',border:'1px solid #DDE5EF',borderRadius:'6px',fontSize:'12px',background:'white',cursor:'pointer'}}>
                          <option value="FREE">Free</option>
                          <option value="PRO">Pro</option>
                          <option value="BUSINESS">Business</option>
                        </select>
                      )}
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'12px',color:'#9EB3C8',whiteSpace:'nowrap'}}>{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRICING */}
      {activeTab==='pricing'&&(
        <div>
          <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:'12px',padding:'14px 18px',marginBottom:'20px',display:'flex',gap:'10px'}}>
            <span>⚠️</span>
            <p style={{fontSize:'13px',color:'#92400E',margin:0}}>Perubahan harga berlaku untuk transaksi baru. Pelanggan existing tidak terpengaruh sampai renewal.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px',marginBottom:'20px'}}>
            <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <h3 style={{fontWeight:700,margin:0}}>Plan Pro</h3>
                <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'#E8F0FB',color:'#1560BD'}}>PRO</span>
              </div>
              <div style={{display:'grid',gap:'12px'}}>
                <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Bulanan (Rp)</label>
                  <input type="number" value={plans.pro_monthly} onChange={e=>setPlans({...plans,pro_monthly:Number(e.target.value)})} style={inp}/></div>
                <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Tahunan (Rp)</label>
                  <input type="number" value={plans.pro_yearly} onChange={e=>setPlans({...plans,pro_yearly:Number(e.target.value)})} style={inp}/>
                  <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'4px'}}>Diskon: {Math.round((1-plans.pro_yearly/(plans.pro_monthly*12))*100)}%</p></div>
              </div>
            </div>
            <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <h3 style={{fontWeight:700,margin:0}}>Plan Business</h3>
                <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'#E1F5EE',color:'#0F6E56'}}>BUSINESS</span>
              </div>
              <div style={{display:'grid',gap:'12px'}}>
                <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Bulanan (Rp)</label>
                  <input type="number" value={plans.biz_monthly} onChange={e=>setPlans({...plans,biz_monthly:Number(e.target.value)})} style={inp}/></div>
                <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Harga Tahunan (Rp)</label>
                  <input type="number" value={plans.biz_yearly} onChange={e=>setPlans({...plans,biz_yearly:Number(e.target.value)})} style={inp}/>
                  <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'4px'}}>Diskon: {Math.round((1-plans.biz_yearly/(plans.biz_monthly*12))*100)}%</p></div>
              </div>
            </div>
          </div>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px',marginBottom:'20px'}}>
            <h3 style={{fontWeight:700,marginBottom:'16px'}}>Batas Plan Gratis</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'12px'}}>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Maks Watch Queries</label>
                <input type="number" value={config.free_max_watches} onChange={e=>setConfig({...config,free_max_watches:Number(e.target.value)})} style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Maks Notifikasi/Bulan</label>
                <input type="number" value={config.free_max_notifs} onChange={e=>setConfig({...config,free_max_notifs:Number(e.target.value)})} style={inp}/></div>
            </div>
          </div>
          <button onClick={()=>saveSection('pricing')} disabled={saving}
            style={{padding:'12px 28px',background:saved==='pricing'?'#0F6E56':'#1560BD',color:'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
            {saving?'⏳ Menyimpan...':saved==='pricing'?'✅ Tersimpan!':'Simpan Perubahan Harga'}
          </button>
        </div>
      )}

      {/* CONFIG */}
      {activeTab==='config'&&(
        <div style={{display:'grid',gap:'16px'}}>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'16px'}}>⚙️ Pengaturan Platform</h3>
            <div style={{display:'grid',gap:'14px'}}>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Nama Platform</label>
                <input value={config.site_name} onChange={e=>setConfig({...config,site_name:e.target.value})} style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Tagline</label>
                <input value={config.site_tagline} onChange={e=>setConfig({...config,site_tagline:e.target.value})} style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Email Kontak</label>
                <input value={config.contact_email} onChange={e=>setConfig({...config,contact_email:e.target.value})} style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Link WhatsApp Support</label>
                <input value={config.contact_wa} onChange={e=>setConfig({...config,contact_wa:e.target.value})} placeholder="https://wa.me/62xxx" style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Label WA (@username)</label>
                <input value={config.contact_wa_label} onChange={e=>setConfig({...config,contact_wa_label:e.target.value})} placeholder="@pantauin" style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Link Telegram Channel</label>
                <input value={config.telegram_channel} onChange={e=>setConfig({...config,telegram_channel:e.target.value})} placeholder="https://t.me/pantauin" style={inp}/></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'12px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#F8FAFC',borderRadius:'10px'}}>
                  <div><p style={{fontWeight:600,fontSize:'14px',margin:0}}>Mode Maintenance</p>
                    <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>Tampilkan halaman maintenance</p></div>
                  <button onClick={()=>setConfig({...config,maintenance_mode:!config.maintenance_mode})}
                    style={{width:'44px',height:'24px',borderRadius:'100px',border:'none',cursor:'pointer',position:'relative',
                      background:config.maintenance_mode?'#EF4444':'#DDE5EF'}}>
                    <span style={{position:'absolute',top:'2px',width:'20px',height:'20px',borderRadius:'50%',background:'white',
                      transition:'left .2s',left:config.maintenance_mode?'22px':'2px'}}/>
                  </button>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#F8FAFC',borderRadius:'10px'}}>
                  <div><p style={{fontWeight:600,fontSize:'14px',margin:0}}>Registrasi Terbuka</p>
                    <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>Izinkan pendaftar baru</p></div>
                  <button onClick={()=>setConfig({...config,allow_registration:!config.allow_registration})}
                    style={{width:'44px',height:'24px',borderRadius:'100px',border:'none',cursor:'pointer',position:'relative',
                      background:config.allow_registration?'#1560BD':'#DDE5EF'}}>
                    <span style={{position:'absolute',top:'2px',width:'20px',height:'20px',borderRadius:'50%',background:'white',
                      transition:'left .2s',left:config.allow_registration?'22px':'2px'}}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button onClick={()=>saveSection('config')} disabled={saving}
            style={{padding:'12px 28px',background:saved==='config'?'#0F6E56':'#1560BD',color:'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
            {saving?'⏳ Menyimpan...':saved==='config'?'✅ Tersimpan!':'Simpan Konfigurasi'}
          </button>
        </div>
      )}

      {/* CONTENT */}
      {activeTab==='content'&&(
        <div style={{display:'grid',gap:'16px'}}>
          {[['terms','📄 Syarat & Ketentuan'],['privacy','🔒 Kebijakan Privasi'],['about','ℹ️ Tentang Pantau.in']].map(([key,label])=>(
            <div key={key} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
              <h3 style={{fontWeight:700,marginBottom:'14px'}}>{label}</h3>
              <textarea value={(legal as any)[key]} onChange={e=>setLegal({...legal,[key]:e.target.value})}
                rows={8} style={{...inp,resize:'vertical',lineHeight:1.6}}/>
            </div>
          ))}
          <button onClick={()=>saveSection('content')} disabled={saving}
            style={{padding:'12px 28px',background:saved==='content'?'#0F6E56':'#1560BD',color:'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
            {saving?'⏳ Menyimpan...':saved==='content'?'✅ Tersimpan!':'Simpan Konten'}
          </button>
        </div>
      )}

      {/* INTEGRATIONS */}

      {activeTab==='referral'&&<div style={{display:'grid',gap:'20px'}}>
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
          <h3 style={{fontWeight:700,marginBottom:'20px',fontSize:'16px'}}>⚙️ Pengaturan Referral Program</h3>
          <div style={{display:'grid',gap:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px',background:'#F8FAFC',borderRadius:'10px'}}>
              <div><p style={{fontWeight:700,margin:0}}>Aktifkan Referral Program</p><p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>User bisa ajak teman dan dapat reward</p></div>
              <button onClick={()=>setReferral(r=>({...r,referral_enabled:!r.referral_enabled}))}
                style={{width:'48px',height:'26px',borderRadius:'100px',border:'none',cursor:'pointer',background:referral.referral_enabled?'#0F6E56':'#DDE5EF',position:'relative',transition:'background .2s'}}>
                <span style={{position:'absolute',top:'3px',width:'20px',height:'20px',borderRadius:'50%',background:'white',transition:'left .2s',left:referral.referral_enabled?'25px':'3px'}}/>
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'14px'}}>
              {[
                ['Bonus Referrer (hari Pro)', 'referral_reward_referrer_days'],
                ['Bonus yang Diajak (hari Pro)', 'referral_reward_referee_days'],
                ['Bonus saat Teman Upgrade (hari)', 'referral_reward_on_upgrade_days'],
                ['Diskon Upgrade Pro (%)', 'referral_discount_pro'],
                ['Diskon Upgrade Business (%)', 'referral_discount_biz'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>{label}</label>
                  <input type="number" value={(referral as any)[key]}
                    onChange={e=>setReferral(r=>({...r,[key]:Number(e.target.value)}))}
                    style={{width:'100%',padding:'10px 12px',border:'1.5px solid #DDE5EF',borderRadius:'8px',fontSize:'14px',outline:'none'}}/>
                </div>
              ))}
            </div>
            <button onClick={()=>saveSection('referral')} disabled={saving}
              style={{padding:'12px',background:'#1560BD',color:'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
              {saving?'⏳ Menyimpan...':'💾 Simpan Pengaturan Referral'}
            </button>
            {saved&&<p style={{color:'#0F6E56',fontWeight:600,textAlign:'center',margin:0}}>{saved}</p>}
          </div>
        </div>
      </div>}
      {activeTab==='integrations'&&(
        <div style={{display:'grid',gap:'16px'}}>
          {/* Info banner */}
          <div style={{background:'#E8F0FB',border:'1px solid #C7D9F8',borderRadius:'12px',padding:'16px 20px',display:'flex',gap:'12px',alignItems:'flex-start'}}>
            <span style={{fontSize:'20px'}}>ℹ️</span>
            <div>
              <p style={{fontWeight:700,color:'#1560BD',margin:'0 0 4px'}}>Cara Mengisi API Keys</p>
              <p style={{fontSize:'13px',color:'#1560BD',margin:0}}>
                Isi field di bawah → klik <strong>"Terapkan ke Server"</strong> → server akan otomatis restart dan menggunakan konfigurasi baru. Field yang kosong tidak akan diubah.
              </p>
            </div>
          </div>

          {/* WhatsApp */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'4px'}}>💬 WhatsApp Business API</h3>
            <p style={{fontSize:'13px',color:'#5A7090',marginBottom:'16px'}}>
              Dari <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" style={{color:'#1560BD'}}>developers.facebook.com</a> → My Apps → WhatsApp → API Setup
            </p>
            <div style={{display:'grid',gap:'12px'}}>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Phone Number ID</label>
                <input value={integrations.wa_phone_id} onChange={e=>setIntegrations({...integrations,wa_phone_id:e.target.value})}
                  placeholder="1234567890123456" style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Access Token</label>
                <input type="password" value={integrations.wa_token} onChange={e=>setIntegrations({...integrations,wa_token:e.target.value})}
                  placeholder="EAAxxxxx..." style={inp}/></div>
            </div>
            <div style={{marginTop:'12px',background:'#E1F5EE',borderRadius:'10px',padding:'10px 14px'}}>
              <p style={{fontSize:'12px',color:'#0F6E56',margin:0}}>
                Webhook URL: <strong>https://pantau.in/api/webhooks/whatsapp</strong>
              </p>
            </div>
          </div>

          {/* Telegram */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'4px'}}>✈️ Telegram Bot</h3>
            <p style={{fontSize:'13px',color:'#5A7090',marginBottom:'16px'}}>
              Chat <strong>@BotFather</strong> di Telegram → /newbot → ikuti instruksi → copy token
            </p>
            <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Bot Token</label>
              <input type="password" value={integrations.telegram_token} onChange={e=>setIntegrations({...integrations,telegram_token:e.target.value})}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" style={inp}/></div>
            <div style={{marginTop:'12px',background:'#E1F5EE',borderRadius:'10px',padding:'10px 14px'}}>
              <p style={{fontSize:'12px',color:'#0F6E56',margin:0}}>
                Set webhook: <strong>https://pantau.in/api/webhooks/telegram</strong>
              </p>
            </div>
          </div>

          {/* Midtrans */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'4px'}}>💳 Midtrans Payment</h3>
            <p style={{fontSize:'13px',color:'#5A7090',marginBottom:'16px'}}>
              <a href="https://dashboard.sandbox.midtrans.com" target="_blank" rel="noopener noreferrer" style={{color:'#1560BD'}}>dashboard.sandbox.midtrans.com</a> → Settings → Access Keys
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'12px',marginBottom:'12px'}}>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Server Key</label>
                <input type="password" value={integrations.midtrans_server_key} onChange={e=>setIntegrations({...integrations,midtrans_server_key:e.target.value})}
                  placeholder="SB-Mid-server-..." style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Client Key</label>
                <input type="password" value={integrations.midtrans_client_key} onChange={e=>setIntegrations({...integrations,midtrans_client_key:e.target.value})}
                  placeholder="SB-Mid-client-..." style={inp}/></div>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',
              background:integrations.midtrans_is_production?'#FEE2E2':'#FEF3C7',borderRadius:'10px',marginBottom:'12px'}}>
              <div>
                <p style={{fontWeight:600,fontSize:'14px',margin:0}}>Mode Production</p>
                <p style={{fontSize:'12px',color:'#92400E',margin:0}}>
                  {integrations.midtrans_is_production?'⚠️ LIVE — Transaksi nyata!':'🧪 Sandbox — Testing mode'}
                </p>
              </div>
              <button onClick={()=>setIntegrations({...integrations,midtrans_is_production:!integrations.midtrans_is_production})}
                style={{width:'44px',height:'24px',borderRadius:'100px',border:'none',cursor:'pointer',position:'relative',
                  background:integrations.midtrans_is_production?'#EF4444':'#DDE5EF'}}>
                <span style={{position:'absolute',top:'2px',width:'20px',height:'20px',borderRadius:'50%',background:'white',
                  left:integrations.midtrans_is_production?'22px':'2px'}}/>
              </button>
            </div>
            <div style={{background:'#E8F0FB',borderRadius:'10px',padding:'10px 14px'}}>
              <p style={{fontSize:'12px',color:'#1560BD',margin:0}}>
                Notification URL: <strong>https://pantau.in/api/midtrans/webhook</strong>
              </p>
            </div>
          </div>

          {/* Email SMTP */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'4px'}}>📧 Email SMTP</h3>
            <p style={{fontSize:'13px',color:'#5A7090',marginBottom:'16px'}}>
              Gmail: Google Account → Security → 2-Step Verification → App Passwords → Generate
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'12px'}}>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>SMTP Host</label>
                <input value={integrations.smtp_host} onChange={e=>setIntegrations({...integrations,smtp_host:e.target.value})} style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>SMTP Port</label>
                <input value={integrations.smtp_port} onChange={e=>setIntegrations({...integrations,smtp_port:e.target.value})} style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Email Pengirim</label>
                <input value={integrations.smtp_user} onChange={e=>setIntegrations({...integrations,smtp_user:e.target.value})}
                  placeholder="noreply@pantau.in" style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Password / App Password</label>
                <input type="password" value={integrations.smtp_pass} onChange={e=>setIntegrations({...integrations,smtp_pass:e.target.value})}
                  placeholder="Gmail App Password (16 karakter)" style={inp}/></div>
            </div>
          </div>

          {/* OpenAI */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'4px'}}>🤖 AI & Scraper Config</h3>
            <p style={{fontSize:'13px',color:'#5A7090',marginBottom:'16px'}}>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{color:'#1560BD'}}>platform.openai.com/api-keys</a> → Create new secret key
            </p>
            <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>OpenAI API Key</label>
              <input type="password" value={integrations.openai_key} onChange={e=>setIntegrations({...integrations,openai_key:e.target.value})}
                placeholder="sk-proj-..." style={inp}/></div>
          </div>

          {/* reCAPTCHA */}
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:700,marginBottom:'4px'}}>🛡️ Google reCAPTCHA v3</h3>
            <p style={{fontSize:'13px',color:'#5A7090',marginBottom:'16px'}}>
              Dari <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noopener noreferrer" style={{color:'#1560BD'}}>google.com/recaptcha/admin</a> → Buat situs baru → pilih reCAPTCHA v3 → domain: pantau.in
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'12px'}}>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Site Key</label>
                <input value={integrations.recaptcha_site_key} onChange={e=>setIntegrations({...integrations,recaptcha_site_key:e.target.value})}
                  placeholder="6Lxxxxxxxxxxxxxxxxxxxxxxxx" style={inp}/></div>
              <div><label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>Secret Key</label>
                <input type="password" value={integrations.recaptcha_secret_key} onChange={e=>setIntegrations({...integrations,recaptcha_secret_key:e.target.value})}
                  placeholder="6Lxxxxxxxxxxxxxxxxxxxxxxxx" style={inp}/></div>
            </div>
            <div style={{marginTop:'12px',background:'#E1F5EE',borderRadius:'10px',padding:'10px 14px'}}>
              <p style={{fontSize:'12px',color:'#0F6E56',margin:0}}>
                Aktif otomatis di halaman Login, Register, dan form publik lainnya begitu key disimpan. Jika belum diisi, verifikasi dilewati (fail-open) agar tidak mengunci akses.
              </p>
            </div>
          </div>

          {/* APPLY TO SERVER BUTTON */}
          <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',borderRadius:'16px',padding:'24px',textAlign:'center'}}>
            <h3 style={{color:'white',fontWeight:800,fontSize:'18px',marginBottom:'8px'}}>🚀 Terapkan ke Server</h3>
            <p style={{color:'rgba(255,255,255,0.75)',fontSize:'13px',marginBottom:'20px',maxWidth:'400px',margin:'0 auto 20px'}}>
              Klik tombol ini untuk menyimpan semua API keys ke server dan restart otomatis. Proses memakan waktu ±10 detik.
            </p>
            <button onClick={applyToServer} disabled={applying}
              style={{padding:'14px 36px',background:applying?'rgba(255,255,255,0.3)':'white',color:applying?'rgba(255,255,255,0.7)':'#1560BD',
                border:'none',borderRadius:'12px',fontWeight:700,cursor:applying?'wait':'pointer',fontSize:'15px',
                boxShadow:applying?'none':'0 4px 20px rgba(0,0,0,0.2)',transition:'all .2s'}}>
              {applying?'⏳ Menerapkan & Restart Server...':'⚡ Terapkan ke Server & Restart'}
            </button>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:'11px',marginTop:'12px',margin:'12px 0 0'}}>
              Hanya field yang diisi yang akan diperbarui. Field kosong dibiarkan seperti semula.
            </p>
          </div>
        </div>
      )}

      {/* AUDIT LOG */}
      {activeTab==='audit'&&(
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #DDE5EF'}}><h3 style={{fontWeight:700,margin:0}}>Audit Log Sistem</h3></div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#F8FAFC'}}>
                {['Waktu','User','Aksi','Detail'].map(h=>(
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',borderBottom:'1px solid #DDE5EF'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log:any,i:number)=>(
                <tr key={log.id} style={{borderBottom:i<auditLogs.length-1?'1px solid #F1F5F9':'none'}}>
                  <td style={{padding:'12px 16px',fontFamily:'monospace',fontSize:'12px',color:'#9EB3C8'}}>{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px',color:'#5A7090'}}>{log.userEmail||'system'}</td>
                  <td style={{padding:'12px 16px'}}>
                    <code style={{background:'#E8F0FB',color:'#1560BD',padding:'2px 8px',borderRadius:'4px',fontSize:'11px',fontWeight:700}}>{log.action}</code>
                  </td>
                  <td style={{padding:'12px 16px',fontSize:'13px',color:'#5A7090'}}>{log.detail||log.ipAddress||'—'}</td>
                </tr>
              ))}
              {!auditLogs.length&&(
                <tr><td colSpan={4} style={{padding:'20px 16px',fontSize:'13px',color:'#9EB3C8',textAlign:'center'}}>Belum ada aktivitas tercatat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUMBER MONITORING */}
      {activeTab==='sources'&&(
        <div>
          {/* SUMMARY STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'16px'}}>
            {[
              ['Total Sumber', sources.length, '📡', '#1560BD', '#E8F0FB'],
              ['Aktif', sources.filter((s:any)=>s.isActive&&s.status!=='error').length, '✅', '#0F6E56', '#DCFCE7'],
              ['Error', sources.filter((s:any)=>s.status==='error').length, '❌', '#991B1B', '#FEE2E2'],
              ['Total Item', sources.reduce((a:number,s:any)=>a+(s.itemsFound||0),0).toLocaleString('id-ID'), '📦', '#6D28D9', '#EDE9FE'],
            ].map(([l,v,i,color,bg])=>(
              <div key={String(l)} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'12px',padding:'14px 16px'}}>
                <div style={{fontSize:'11px',fontWeight:600,color:'#5A7090',textTransform:'uppercase',marginBottom:'6px'}}>{l}</div>
                <div style={{fontSize:'22px',fontWeight:800,color:String(color)}}>{String(i)} {String(v)}</div>
              </div>
            ))}
          </div>
          {/* REFRESH BAR */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',padding:'10px 16px',background:'white',borderRadius:'10px',border:'1px solid #DDE5EF'}}>
            <div style={{fontSize:'13px',color:'#5A7090'}}>
              🔄 Auto-refresh tiap 30 detik
              {lastRefresh&&<span style={{marginLeft:'8px',color:'#9EB3C8'}}>· Terakhir: {lastRefresh.toLocaleTimeString('id-ID')}</span>}
            </div>
            <button onClick={()=>fetch('/api/superadmin/sources').then(r=>r.json()).then(d=>{ if(d.sources){ setSources(d.sources); setLastRefresh(new Date()) } })}
              style={{padding:'6px 14px',borderRadius:'8px',border:'1px solid #DDE5EF',background:'white',fontSize:'12px',fontWeight:600,color:'#1560BD',cursor:'pointer'}}>
              🔄 Refresh Sekarang
            </button>
          </div>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px 24px',marginBottom:'16px'}}>
            <h3 style={{fontWeight:700,marginBottom:'4px'}}>Tambah Sumber Monitoring</h3>
            <p style={{fontSize:'13px',color:'#5A7090',marginBottom:'16px'}}>Hanya RSS feed atau JSON API resmi — bukan scraping HTML situs pihak ketiga, supaya aman secara hukum.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'12px',marginBottom:'12px'}}>
              <input style={inp} placeholder="Nama sumber (mis. LPSE Nasional)" value={newSource.source} onChange={e=>setNewSource({...newSource,source:e.target.value})}/>
              <select style={inp} value={newSource.category} onChange={e=>setNewSource({...newSource,category:e.target.value})}>
                {['TENDER','PROPERTI','KENDARAAN','BISNIS','INVESTASI','LOWONGAN','BEASISWA','BANTUAN'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <input style={inp} placeholder="URL feed RSS/JSON" value={newSource.url} onChange={e=>setNewSource({...newSource,url:e.target.value})}/>
              <select style={inp} value={newSource.type} onChange={e=>setNewSource({...newSource,type:e.target.value})}>
                <option value="RSS">RSS / Atom Feed</option>
                <option value="JSON_API">JSON API</option>
              </select>
              <input style={inp} type="number" min={5} placeholder="Interval cek (menit)" value={newSource.intervalMinutes} onChange={e=>setNewSource({...newSource,intervalMinutes:Number(e.target.value)})}/>
            </div>
            <button onClick={addSource} disabled={savingSource} style={{padding:'10px 20px',borderRadius:'8px',border:'none',background:'#1560BD',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
              {savingSource?'Menyimpan...':'+ Tambah Sumber'}
            </button>
          </div>
          <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['Sumber','Kategori','Tipe','Status','Item Terbaru','Error','Last Error','Aksi'].map(h=>(
                    <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',borderBottom:'1px solid #DDE5EF'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s:any)=>(
                  <tr key={s.id} style={{borderBottom:'1px solid #F1F5F9'}}>
                    <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:600}}>{s.source}<div style={{fontSize:'11px',color:'#9EB3C8',fontWeight:400,maxWidth:'260px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.url}</div></td>
                    <td style={{padding:'12px 16px',fontSize:'13px'}}>{s.category}</td>
                    <td style={{padding:'12px 16px',fontSize:'13px'}}>{s.type}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',
                        background:s.status==='error'?'#FEE2E2':s.isActive?'#DCFCE7':'#F1F5F9',
                        color:s.status==='error'?'#991B1B':s.isActive?'#166534':'#64748b'}}>
                        {s.status==='error'?'Error':s.isActive?'Aktif':'Nonaktif'}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'13px',color:'#5A7090'}}>{s.itemsFound} item{s.lastRunAt?` · ${new Date(s.lastRunAt).toLocaleTimeString('id-ID')}`:''}</td>
                    <td style={{padding:'12px 16px',fontSize:'13px',textAlign:'center'}}>
                      {s.errorCount>0?<span style={{fontWeight:700,color:'#991B1B'}}>{s.errorCount}x</span>:<span style={{color:'#9EB3C8'}}>—</span>}
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'11px',color:'#991B1B',maxWidth:'200px'}}>
                      {s.lastError?<span title={s.lastError}>{s.lastError.slice(0,50)}{s.lastError.length>50?'...':''}</span>:<span style={{color:'#9EB3C8'}}>—</span>}
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <button onClick={()=>toggleSource(s.id,s.isActive)} style={{fontSize:'12px',fontWeight:600,color:'#1560BD',background:'none',border:'none',cursor:'pointer',marginRight:'10px'}}>{s.isActive?'Nonaktifkan':'Aktifkan'}</button>
                      <button onClick={()=>deleteSource(s.id)} style={{fontSize:'12px',fontWeight:600,color:'#991B1B',background:'none',border:'none',cursor:'pointer'}}>Hapus</button>
                    </td>
                  </tr>
                ))}
                {!sources.length&&(
                  <tr><td colSpan={8} style={{padding:'20px 16px',fontSize:'13px',color:'#9EB3C8',textAlign:'center'}}>Belum ada sumber monitoring. Tambahkan di atas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
