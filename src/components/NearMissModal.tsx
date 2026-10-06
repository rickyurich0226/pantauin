'use client'
import { useRouter } from 'next/navigation'

interface Props {
  items: any[]
  onClose: () => void
}

export default function NearMissModal({ items, onClose }: Props) {
  const fallback = [
    {title:'Tender Konstruksi Gedung APBD Jawa Barat — Rp 2,4 Miliar',category:'TENDER'},
    {title:'Dijual Ruko 3 Lantai Strategis Pinggir Jalan Raya — Nego',category:'PROPERTI'},
    {title:'Franchise Minuman Kekinian Modal 15 Juta ROI 6 Bulan',category:'BISNIS'},
  ]
  const list = items.length > 0 ? items.slice(0,3) : fallback

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'24px',width:'100%',maxWidth:'420px',boxShadow:'0 24px 64px rgba(0,0,0,0.35)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:'linear-gradient(135deg,#DC2626,#7F1D1D)',padding:'20px 24px 16px',position:'relative'}}>
          <button onClick={onClose} style={{position:'absolute',top:'12px',right:'12px',background:'rgba(255,255,255,0.2)',border:'none',color:'white',borderRadius:'50%',width:'28px',height:'28px',cursor:'pointer',fontSize:'14px'}}>✕</button>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',margin:'0 0 4px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>⚠️ Batas Free Plan</p>
          <h2 style={{color:'white',fontWeight:800,fontSize:'18px',margin:0,lineHeight:1.3}}>Kamu hampir ketinggalan peluang ini!</h2>
        </div>
        <div style={{padding:'14px 20px',background:'#F8FAFC',borderBottom:'1px solid #E8EEF5'}}>
          <p style={{fontSize:'11px',color:'#9EB3C8',margin:'0 0 8px',fontWeight:600,textTransform:'uppercase'}}>🔒 Terkunci untuk kamu</p>
          <div style={{display:'grid',gap:'6px'}}>
            {list.map((item:any,i:number)=>(
              <div key={i} style={{display:'flex',gap:'10px',alignItems:'center',background:'white',borderRadius:'8px',padding:'8px 10px',border:'1px solid #E8EEF5',filter:'blur(1.5px)',userSelect:'none'}}>
                <span style={{fontSize:'16px',flexShrink:0}}>🔒</span>
                <p style={{fontSize:'12px',color:'#0D1B2A',margin:0,fontWeight:500,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title||item.t}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:'16px 20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div>
              <p style={{fontSize:'11px',color:'#9EB3C8',margin:'0 0 2px',textTransform:'uppercase'}}>Plan Pro</p>
              <p style={{fontSize:'22px',fontWeight:800,color:'#0D1B2A',margin:0}}>Rp 49.000<span style={{fontSize:'13px',fontWeight:400,color:'#9EB3C8'}}>/bln</span></p>
            </div>
            <div style={{textAlign:'right'}}>
              {['✅ 20 pantauan','✅ Notif WA','✅ Riwayat 90 hari'].map(f=>(
                <p key={f} style={{fontSize:'11px',color:'#0F6E56',margin:'0 0 2px',fontWeight:600}}>{f}</p>
              ))}
            </div>
          </div>
          <a href="/dashboard/upgrade" style={{display:'block',background:'linear-gradient(135deg,#DC2626,#B91C1C)',color:'white',textDecoration:'none',textAlign:'center',padding:'13px',borderRadius:'10px',fontSize:'15px',fontWeight:700,marginBottom:'8px'}}>
            🔥 Upgrade Sekarang
          </a>
          <button onClick={onClose} style={{width:'100%',padding:'10px',background:'transparent',border:'none',cursor:'pointer',fontSize:'13px',color:'#9EB3C8'}}>
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  )
}
