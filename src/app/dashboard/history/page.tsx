'use client'
import { useState, useEffect } from 'react'

export default function HistoryPage() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const CAT_ICONS: Record<string,string> = {TENDER:'📋',PROPERTI:'🏠',KENDARAAN:'🚗',BISNIS:'💼',INVESTASI:'📈',LOWONGAN:'👔',BEASISWA:'🎓',BANTUAN:'🤝'}

  useEffect(()=>{
    fetch('/api/notifications?limit=100').then(r=>r.json()).then(d=>{
      if(d.notifications) setNotifs(d.notifications.filter((n:any)=>n.isRead))
      setLoading(false)
    })
  },[])

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:800}}>Riwayat Peluang 📊</h1>
        <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>{notifs.length} peluang yang sudah ditemukan</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'16px',marginBottom:'28px'}}>
        {[['Total Peluang',notifs.length,'🎯'],['Minggu Ini',notifs.filter(n=>new Date(n.sentAt)>new Date(Date.now()-7*24*60*60*1000)).length,'📅'],
          ['Rata-rata Skor',notifs.length?`${Math.round(notifs.reduce((a,n)=>a+n.matchScore,0)/notifs.length*100)}%`:'—','🎯'],
          ['Kategori Terbanyak',notifs.length?Object.entries(notifs.reduce((a:any,n:any)=>{const c=n.watch?.category||'OTHER';a[c]=(a[c]||0)+1;return a},{})).sort((a:any,b:any)=>b[1]-a[1])[0]?.[0]||'—':'—','📋']
        ].map(([l,v,i])=>(
          <div key={String(l)} style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'14px',padding:'18px'}}>
            <p style={{fontSize:'12px',fontWeight:600,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>{l}</p>
            <p style={{fontSize:'24px',fontWeight:800}}>{String(i)} {String(v)}</p>
          </div>
        ))}
      </div>

      {loading?<div style={{textAlign:'center',padding:'48px',color:'#5A7090'}}>⏳ Memuat riwayat...</div>:
      notifs.length===0?(<div style={{background:'white',border:'2px dashed #DDE5EF',borderRadius:'16px',padding:'48px',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>📊</div>
        <h3 style={{fontWeight:700,marginBottom:'8px'}}>Riwayat masih kosong</h3>
        <p style={{color:'#5A7090',fontSize:'14px'}}>Peluang yang sudah dibaca akan tampil di sini.</p>
      </div>):(
        <div style={{background:'white',border:'1px solid #DDE5EF',borderRadius:'16px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#F8FAFC'}}>
                {['Peluang','Kategori','Skor AI','Channel','Waktu'].map(h=>(
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#5A7090',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid #DDE5EF'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notifs.map((n,i)=>(
                <tr key={n.id} style={{borderBottom:i<notifs.length-1?'1px solid #F1F5F9':'none'}}>
                  <td style={{padding:'12px 16px'}}>
                    <p style={{fontWeight:600,fontSize:'14px',marginBottom:'2px'}}>{n.title}</p>
                    {n.sourceUrl&&<a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'#1560BD'}}>Lihat sumber →</a>}
                  </td>
                  <td style={{padding:'12px 16px'}}><span style={{fontSize:'13px'}}>{CAT_ICONS[n.watch?.category]||'🎯'} {n.watch?.category||'—'}</span></td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{fontSize:'12px',fontWeight:700,background:n.matchScore>=0.8?'#DCFCE7':n.matchScore>=0.6?'#FEF3C7':'#FEE2E2',color:n.matchScore>=0.8?'#166534':n.matchScore>=0.6?'#92400E':'#991B1B',padding:'3px 8px',borderRadius:'100px'}}>
                      {Math.round(n.matchScore*100)}%
                    </span>
                  </td>
                  <td style={{padding:'12px 16px',fontSize:'13px',color:'#5A7090'}}>{n.channel}</td>
                  <td style={{padding:'12px 16px',fontSize:'12px',color:'#9EB3C8'}}>{new Date(n.sentAt).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
