'use client'
import { useState, useEffect } from 'react'

export default function ReferralPage() {
  const [data, setData] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{msg:string}|null>(null)
  const showToast = (msg:string)=>{setToast({msg});setTimeout(()=>setToast(null),3000)}
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referral').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  const copy = async () => {
    await navigator.clipboard.writeText(data?.referralLink ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = () => {
    const text = `Hei! Aku pakai Pantau.in buat monitor tender, properti & peluang bisnis otomatis. Daftar pakai link aku dan kita sama-sama dapat bonus: ${data?.referralLink}`
    if (navigator.share) {
      navigator.share({ title: 'Pantau.in', text, url: data?.referralLink })
    } else {
      navigator.clipboard.writeText(text)
      showToast('Teks berhasil disalin!')
    }
  }

  if (loading) return <div style={{textAlign:'center',padding:'60px',color:'#9EB3C8'}}>⏳ Memuat...</div>

  const cfg = data?.config ?? {}

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:800}}>Referral Program 🎁</h1>
        <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>Ajak teman, kamu dan temanmu sama-sama dapat bonus!</p>
      </div>

      {/* Reward cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'14px',marginBottom:'24px'}}>
        {[
          {i:'👤',t:'Teman Daftar & Aktif',d:`Kamu +${cfg.referrerDays} hari Pro`,d2:`Teman +${cfg.refereeDays} hari Pro`,c:'#1560BD',bg:'#E8F0FB'},
          {i:'⬆️',t:'Teman Upgrade Pro',d:`Kamu +${cfg.upgradeDays} hari Pro`,d2:`Teman diskon ${cfg.discountPro}%`,c:'#0F6E56',bg:'#E1F5EE'},
          {i:'🏆',t:'Teman Upgrade Business',d:`Kamu +${cfg.upgradeDays} hari Pro`,d2:`Teman diskon ${cfg.discountBiz}%`,c:'#7C3AED',bg:'#F3F0FF'},
        ].map(({i,t,d,d2,c,bg}) => (
          <div key={t} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'18px'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'12px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',marginBottom:'10px'}}>{i}</div>
            <p style={{fontWeight:700,fontSize:'14px',color:'#0D1B2A',marginBottom:'6px'}}>{t}</p>
            <p style={{fontSize:'12px',color:c,fontWeight:600,margin:'0 0 2px'}}>✓ {d}</p>
            <p style={{fontSize:'12px',color:'#5A7090',margin:0}}>✓ {d2}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'24px',marginBottom:'20px'}}>
        <h3 style={{fontWeight:700,marginBottom:'16px'}}>Link Referral Kamu</h3>
        <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'200px',background:'#F8FAFC',border:'1.5px solid #DDE5EF',borderRadius:'10px',padding:'12px 14px',fontSize:'14px',color:'#0D1B2A',fontWeight:600,wordBreak:'break-all'}}>
            {data?.referralLink}
          </div>
          <button onClick={copy} style={{padding:'12px 20px',background:copied?'#0F6E56':'#1560BD',color:'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'13px',whiteSpace:'nowrap'}}>
            {copied ? '✓ Disalin!' : '📋 Salin'}
          </button>
        </div>
        <button onClick={share} style={{width:'100%',padding:'12px',background:'#F8FAFC',border:'1.5px solid #DDE5EF',borderRadius:'10px',fontWeight:600,cursor:'pointer',fontSize:'14px',color:'#0D1B2A'}}>
          📤 Bagikan ke WhatsApp / Sosmed
        </button>
        <p style={{fontSize:'12px',color:'#9EB3C8',marginTop:'10px',textAlign:'center'}}>
          Kode referral kamu: <strong style={{color:'#1560BD'}}>{data?.referralCode}</strong>
        </p>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))',gap:'12px',marginBottom:'20px'}}>
        {[
          {i:'👥',v:data?.referralCount ?? 0,l:'Total Teman Diajak'},
          {i:'⭐',v:data?.referrals?.filter((r:any)=>r.plan!=='FREE').length ?? 0,l:'Upgrade ke Pro/Business'},
        ].map(({i,v,l}) => (
          <div key={l} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'18px',display:'flex',gap:'14px',alignItems:'center'}}>
            <span style={{fontSize:'28px'}}>{i}</span>
            <div>
              <p style={{fontSize:'24px',fontWeight:800,color:'#0D1B2A',margin:0}}>{v}</p>
              <p style={{fontSize:'12px',color:'#9EB3C8',margin:0}}>{l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Referral list */}
      {data?.referrals?.length > 0 && (
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',padding:'20px'}}>
          <h3 style={{fontWeight:700,marginBottom:'14px',fontSize:'15px'}}>Teman yang Bergabung</h3>
          <div style={{display:'grid',gap:'8px'}}>
            {data.referrals.map((r:any, i:number) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'#F8FAFC',borderRadius:'10px'}}>
                <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#E8F0FB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,color:'#1560BD'}}>
                    {r.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span style={{fontSize:'13px',fontWeight:600,color:'#0D1B2A'}}>{r.name}</span>
                </div>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',background:r.plan==='FREE'?'#F1F5F9':'#E1F5EE',color:r.plan==='FREE'?'#9EB3C8':'#0F6E56'}}>{r.plan}</span>
                  <span style={{fontSize:'11px',color:'#9EB3C8'}}>{new Date(r.joinedAt).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.referrals?.length === 0 && (
        <div style={{background:'white',border:'2px dashed #DDE5EF',borderRadius:'16px',padding:'40px',textAlign:'center'}}>
          <div style={{fontSize:'40px',marginBottom:'12px'}}>👥</div>
          <h3 style={{fontWeight:700,marginBottom:'8px'}}>Belum ada yang bergabung</h3>
          <p style={{color:'#5A7090',fontSize:'14px'}}>Bagikan link referralmu ke teman, grup WhatsApp, atau sosial media!</p>
        </div>
      )}
      {toast&&<div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',zIndex:99998,background:'#0F6E56',color:'white',padding:'12px 24px',borderRadius:'12px',fontSize:'14px',fontWeight:600,boxShadow:'0 8px 24px rgba(0,0,0,0.2)'}}>{toast.msg}</div>}
    </div>
  )
}
