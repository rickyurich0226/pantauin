'use client'
import { useState, useEffect } from 'react'
const CAT_ICONS: Record<string,string> = {TENDER:'📋',PROPERTI:'🏠',KENDARAAN:'🚗',BISNIS:'💼',INVESTASI:'📈',LOWONGAN:'👔',BEASISWA:'🎓',BANTUAN:'🤝'}
const CH_ICONS: Record<string,string> = {EMAIL:'📧',WHATSAPP:'💬',TELEGRAM:'✈️',PUSH:'🔔'}
const CATS = ['ALL','UNREAD','TENDER','PROPERTI','KENDARAAN','BISNIS','INVESTASI','LOWONGAN','BEASISWA','BANTUAN']

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState<string|null>(null)
  const PER_PAGE = 20

  const load = async (p = 1, append = false) => {
    setLoading(true)
    const r = await fetch(`/api/notifications?limit=${PER_PAGE}&offset=${(p-1)*PER_PAGE}`)
    const d = await r.json()
    if (d.notifications) {
      setNotifs(prev => append ? [...prev, ...d.notifications] : d.notifications)
      setUnread(d.unread ?? 0)
      setHasMore(d.notifications.length === PER_PAGE)
    }
    setLoading(false)
  }

  useEffect(() => { load(1) }, [])

  const markRead = async (id?: string) => {
    await fetch('/api/notifications', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})})
    if (id) setNotifs(notifs.map(n => n.id===id ? {...n, isRead:true} : n))
    else setNotifs(notifs.map(n => ({...n, isRead:true})))
    setUnread(0)
  }

  const deleteNotif = async (id: string) => {
    await fetch('/api/notifications', {method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})})
    setNotifs(notifs.filter(n => n.id !== id))
  }

  const sendFeedback = async (id: string, feedback: string) => {
    setFeedbackLoading(id + feedback)
    try {
      await fetch(`/api/notifications/${id}/feedback`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ feedback })
      })
      setNotifs(notifs.map(n => n.id === id ? {...n, feedback} : n))
    } finally {
      setFeedbackLoading(null)
    }
  }

  const loadMore = () => { const next = page + 1; setPage(next); load(next, true) }

  const filtered = filter==='ALL' ? notifs
    : filter==='UNREAD' ? notifs.filter(n => !n.isRead)
    : notifs.filter(n => n.watch?.category === filter)

  const fmt = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (diff < 1) return 'baru saja'
    if (diff < 60) return diff + ' menit lalu'
    if (diff < 1440) return Math.floor(diff/60) + ' jam lalu'
    if (diff < 10080) return Math.floor(diff/1440) + ' hari lalu'
    return new Date(d).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:800}}>Notifikasi 🔔</h1>
          <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>
            {unread > 0 ? <span style={{color:'#1560BD',fontWeight:700}}>{unread} belum dibaca</span> : 'Semua sudah dibaca'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={() => markRead()} style={{padding:'8px 16px',border:'1px solid #DDE5EF',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'13px',fontWeight:600,color:'#1560BD'}}>
            ✓ Tandai semua dibaca
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'20px'}}>
        {CATS.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{padding:'6px 14px',borderRadius:'100px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,
              background:filter===c?'#1560BD':'#F1F5F9',color:filter===c?'white':'#5A7090'}}>
            {c==='ALL'?'Semua':c==='UNREAD'?`Belum Dibaca${unread>0?` (${unread})`:''}`:CAT_ICONS[c]+' '+c.charAt(0)+c.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && notifs.length === 0 ? (
        <div style={{textAlign:'center',padding:'48px',color:'#9EB3C8'}}>⏳ Memuat...</div>
      ) : filtered.length === 0 ? (
        <div style={{background:'white',border:'2px dashed #DDE5EF',borderRadius:'16px',padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'12px'}}>🔔</div>
          <h3 style={{fontWeight:700,marginBottom:'8px'}}>Belum ada notifikasi</h3>
          <p style={{color:'#5A7090',fontSize:'14px'}}>Notifikasi akan muncul saat pantauan kamu menemukan peluang baru.</p>
        </div>
      ) : (
        <div style={{display:'grid',gap:'10px'}}>
          {filtered.map(n => (
            <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
              style={{background:n.isRead?'white':'#F5F8FF',border:`1.5px solid ${n.isRead?'#F1F5F9':'#1560BD'}`,borderRadius:'14px',
                padding:'16px 20px',cursor:n.isRead?'default':'pointer',position:'relative'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',flexWrap:'wrap'}}>
                    {!n.isRead && <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#1560BD',display:'inline-block',flexShrink:0}}/>}
                    {n.watch?.category && <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',background:'#E8F0FB',color:'#1560BD'}}>{CAT_ICONS[n.watch.category]} {n.watch.category}</span>}
                    {n.channel && <span style={{fontSize:'11px',color:'#9EB3C8'}}>{CH_ICONS[n.channel]} {n.channel}</span>}
                    {n.matchScore > 0 && <span style={{fontSize:'11px',color:'#0F6E56',fontWeight:600}}>⚡ {Math.round(n.matchScore*100)}% match</span>}
                  </div>
                  <h3 style={{fontWeight:700,fontSize:'14px',marginBottom:'6px',color:'#0D1B2A',lineHeight:1.4}}>{n.title}</h3>
                  <p style={{fontSize:'13px',color:'#5A7090',lineHeight:1.6,marginBottom:'8px'}}>{n.body?.slice(0,200)}{n.body?.length>200?'...':''}</p>
                  <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:'12px',color:'#9EB3C8'}}>{fmt(n.sentAt||n.createdAt)}</span>
                    {n.watch?.name && <span style={{fontSize:'12px',color:'#5A7090'}}>dari: <strong>{n.watch.name}</strong></span>}
                    {n.sourceUrl && (
                      <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{fontSize:'12px',color:'#1560BD',fontWeight:600,textDecoration:'none'}}>
                        Lihat listing →
                      </a>
                    )}
                    <a href={`https://wa.me/?text=${encodeURIComponent('🔔 *Peluang dari Pantau.in*\n\n' + n.title + '\n\n' + (n.body?.slice(0,150) ?? '') + (n.sourceUrl ? '\n\nSelengkapnya: ' + n.sourceUrl : '') + '\n\n_Dipantau via pantau.in_')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{fontSize:'12px',color:'#0F6E56',fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'3px'}}>
                      💬 Bagikan ke WA
                    </a>
                  </div>

                  {/* Feedback buttons */}
                  <div style={{marginTop:'10px',display:'flex',gap:'6px',alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                    <span style={{fontSize:'11px',color:'#9EB3C8'}}>Relevan?</span>
                    <button
                      onClick={() => sendFeedback(n.id, 'RELEVANT')}
                      disabled={!!feedbackLoading}
                      style={{padding:'3px 10px',borderRadius:'100px',border:'1.5px solid',
                        borderColor: n.feedback==='RELEVANT' ? '#0F6E56' : '#DDE5EF',
                        background: n.feedback==='RELEVANT' ? '#E1F5EE' : 'white',
                        color: n.feedback==='RELEVANT' ? '#0F6E56' : '#9EB3C8',
                        cursor:'pointer',fontSize:'12px',fontWeight:n.feedback==='RELEVANT'?700:400,
                        transition:'all .15s'}}>
                      {feedbackLoading===n.id+'RELEVANT' ? '...' : '👍 Ya'}
                    </button>
                    <button
                      onClick={() => sendFeedback(n.id, 'NOT_RELEVANT')}
                      disabled={!!feedbackLoading}
                      style={{padding:'3px 10px',borderRadius:'100px',border:'1.5px solid',
                        borderColor: n.feedback==='NOT_RELEVANT' ? '#EF4444' : '#DDE5EF',
                        background: n.feedback==='NOT_RELEVANT' ? '#FEF2F2' : 'white',
                        color: n.feedback==='NOT_RELEVANT' ? '#EF4444' : '#9EB3C8',
                        cursor:'pointer',fontSize:'12px',fontWeight:n.feedback==='NOT_RELEVANT'?700:400,
                        transition:'all .15s'}}>
                      {feedbackLoading===n.id+'NOT_RELEVANT' ? '...' : '👎 Tidak'}
                    </button>
                    {n.feedback && <span style={{fontSize:'11px',color:'#9EB3C8'}}>✓ Terima kasih!</span>}
                  </div>

                </div>
                <button onClick={e=>{e.stopPropagation();deleteNotif(n.id)}}
                  style={{padding:'4px 8px',border:'1px solid #FEE2E2',borderRadius:'6px',background:'white',color:'#EF4444',cursor:'pointer',fontSize:'11px',flexShrink:0}}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div style={{textAlign:'center',marginTop:'20px'}}>
          <button onClick={loadMore} style={{padding:'10px 32px',border:'1px solid #DDE5EF',borderRadius:'10px',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600,color:'#5A7090'}}>
            Muat lebih banyak
          </button>
        </div>
      )}
      {loading && notifs.length > 0 && <div style={{textAlign:'center',padding:'20px',color:'#9EB3C8'}}>⏳ Memuat...</div>}
    </div>
  )
}
