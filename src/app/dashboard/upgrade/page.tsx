'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const PLANS = [
  { key:'FREE', name:'Free', price:0, priceYear:0, color:'#64748b',
    features:['3 watch queries','Digest harian (Email saja)','5 kategori sumber','Riwayat 7 hari'],
    notFeatures:['WhatsApp/Telegram/Push','Notifikasi real-time','Unlimited queries','API Access'] },
  { key:'PRO', name:'Pro', price:49000, priceYear:470000, color:'#1560BD', popular:true,
    features:['Unlimited watch queries','Notifikasi real-time','Email + WhatsApp + Telegram + Push','Ribuan sumber internet','Riwayat 90 hari','Filter lanjutan'],
    notFeatures:['API Access','Akun tim','Custom scraper'] },
  { key:'BUSINESS', name:'Business', price:149000, priceYear:1430000, color:'#0F6E56',
    features:['Semua fitur Pro','REST API Access','5 akun tim','Custom scraper source','Riwayat 1 tahun','Priority support','White-label notifikasi'],
    notFeatures:[] },
]

const PAYMENT_METHODS = [
  {id:'bank_transfer',i:'🏦',n:'Transfer Bank',d:'BCA, Mandiri, BNI, BRI'},
  {id:'credit_card',i:'💳',n:'Kartu Kredit',d:'Visa, Mastercard, JCB'},
  {id:'qris',i:'📱',n:'QRIS',d:'Semua e-wallet & m-banking'},
  {id:'gopay',i:'🟢',n:'GoPay',d:'Gojek ecosystem'},
  {id:'ovo',i:'🟣',n:'OVO',d:'Tokopedia ecosystem'},
  {id:'shopeepay',i:'🟠',n:'ShopeePay',d:'Shopee ecosystem'},
]

export default function UpgradePage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const currentPlan = user?.plan || 'FREE'
  const [billing, setBilling] = useState<'MONTHLY'|'YEARLY'>('MONTHLY')
  const [selectedPlan, setSelectedPlan] = useState('PRO')
  const [selectedMethod, setSelectedMethod] = useState('bank_transfer')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:'ok'|'err'}|null>(null)
  const showToast = (msg:string,type:'ok'|'err'='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),3500)}
  const [loading, setLoading] = useState(false)

  const plan = PLANS.find(p=>p.key===selectedPlan)!
  const price = billing==='YEARLY' ? plan.priceYear : plan.price
  const tax = Math.round(price*0.11)
  const total = price+tax
  const discount = plan.price>0 ? Math.round((1-plan.priceYear/(plan.price*12))*100) : 0

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'Mid-client-3vB8nfj41U2jQJAC'
    const script = document.createElement('script')
    script.src = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION==='true' ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const pay = async() => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:selectedPlan,billing})})
      const data = await res.json()
      if(data.token && (window as any).snap) {
        (window as any).snap.pay(data.token,{
          onSuccess:()=>{ window.location.href='/dashboard?payment=success' },
          onPending:()=>{ window.location.href='/dashboard?payment=pending' },
          onError:()=>showToast('Pembayaran gagal. Silakan coba lagi.','err'),
          onClose:()=>{}
        })
      } else if(data.redirectUrl) {
        window.open(data.redirectUrl,'_blank')
      } else {
        showToast(data.error||'Gagal membuat transaksi','err')
      }
    } catch(e) { showToast('Koneksi ke payment gateway gagal','err') }
    setLoading(false)
  }

  return (
    <div>
      <div style={{marginBottom:'28px'}}>
        <h1 style={{fontSize:'24px',fontWeight:800}}>Upgrade Plan ⭐</h1>
        <p style={{color:'#5A7090',marginTop:'4px',fontSize:'14px'}}>Plan saat ini: <strong>{currentPlan}</strong> — Pilih plan yang sesuai kebutuhanmu.</p>
      </div>

      {/* Billing toggle */}
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'28px',justifyContent:'center'}}>
        <span style={{fontSize:'14px',fontWeight:billing==='MONTHLY'?700:400,color:billing==='MONTHLY'?'#0D1B2A':'#5A7090'}}>Bulanan</span>
        <button onClick={()=>setBilling(b=>b==='MONTHLY'?'YEARLY':'MONTHLY')}
          style={{width:'48px',height:'26px',borderRadius:'100px',border:'none',cursor:'pointer',position:'relative',background:billing==='YEARLY'?'#0F6E56':'#DDE5EF'}}>
          <span style={{position:'absolute',top:'3px',width:'20px',height:'20px',borderRadius:'50%',background:'white',transition:'left .2s',left:billing==='YEARLY'?'25px':'3px'}}/>
        </button>
        <span style={{fontSize:'14px',fontWeight:billing==='YEARLY'?700:400,color:billing==='YEARLY'?'#0D1B2A':'#5A7090'}}>
          Tahunan <span style={{background:'#E1F5EE',color:'#0F6E56',fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px'}}>Hemat 20%</span>
        </span>
      </div>

      {/* Plans */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'16px',marginBottom:'32px'}}>
        {PLANS.map(p=>{
          const isCurrentPlan = currentPlan===p.key
          const pr = billing==='YEARLY'?p.priceYear:p.price
          return (
            <div key={p.key} onClick={()=>p.key!=='FREE'&&setSelectedPlan(p.key)}
              style={{background:'white',border:`2px solid ${selectedPlan===p.key&&p.key!=='FREE'?p.color:isCurrentPlan?'#DDE5EF':'#DDE5EF'}`,
                borderRadius:'16px',padding:'24px',position:'relative',cursor:p.key!=='FREE'?'pointer':'default',
                boxShadow:p.popular?'0 4px 24px rgba(21,96,189,0.15)':'none'}}>
              {p.popular&&<div style={{position:'absolute',top:'-12px',left:'50%',transform:'translateX(-50%)',background:'#1560BD',color:'white',fontSize:'11px',fontWeight:700,padding:'3px 14px',borderRadius:'100px',whiteSpace:'nowrap'}}>Paling Populer</div>}
              {isCurrentPlan&&<div style={{position:'absolute',top:'12px',right:'12px',background:'#E1F5EE',color:'#0F6E56',fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'100px'}}>Plan Kamu</div>}
              <div style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'#F8FAFC',color:'#5A7090',display:'inline-block',marginBottom:'12px',textTransform:'uppercase'}}>{p.name}</div>
              <div>
                <span style={{fontSize:'36px',fontWeight:800,color:'#0D1B2A'}}>{pr===0?'Gratis':`Rp ${(pr/1000).toFixed(0)}K`}</span>
                {pr>0&&<span style={{fontSize:'14px',color:'#5A7090'}}>{billing==='YEARLY'?'/tahun':'/bln'}</span>}
              </div>
              {billing==='YEARLY'&&p.price>0&&<p style={{fontSize:'12px',color:'#5A7090',marginTop:'2px'}}>≈ Rp {(p.priceYear/12/1000).toFixed(0)}K/bln (hemat {discount}%)</p>}
              <div style={{borderTop:'1px solid #F1F5F9',margin:'16px 0',paddingTop:'16px'}}>
                {p.features.map(f=><div key={f} style={{display:'flex',gap:'8px',marginBottom:'8px',fontSize:'13px',color:'#0D1B2A'}}>
                  <span style={{color:'#0F6E56',fontWeight:700}}>✓</span>{f}</div>)}
                {p.notFeatures.map(f=><div key={f} style={{display:'flex',gap:'8px',marginBottom:'8px',fontSize:'13px',color:'#9EB3C8'}}>
                  <span>—</span>{f}</div>)}
              </div>
              {p.key==='FREE'?<div style={{padding:'11px',textAlign:'center',borderRadius:'10px',border:'1px solid #DDE5EF',fontSize:'14px',color:'#5A7090',fontWeight:500}}>{isCurrentPlan?'Plan Saat Ini':'Gratis Selamanya'}</div>:
              <button onClick={()=>{setSelectedPlan(p.key);setShowModal(true)}} disabled={isCurrentPlan}
                style={{width:'100%',padding:'12px',background:isCurrentPlan?'#F1F5F9':p.color,color:isCurrentPlan?'#9EB3C8':'white',border:'none',borderRadius:'10px',fontWeight:700,cursor:isCurrentPlan?'default':'pointer',fontSize:'14px'}}>
                {isCurrentPlan?'Plan Aktif':`Pilih ${p.name} →`}</button>}
            </div>
          )
        })}
      </div>

      {/* Payment Modal */}
      {showModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div style={{background:'white',borderRadius:'20px',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(13,27,42,0.2)'}}>
            <div style={{padding:'24px 28px',borderBottom:'1px solid #DDE5EF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h2 style={{fontSize:'20px',fontWeight:800}}>Checkout — {PLANS.find(p=>p.key===selectedPlan)?.name}</h2>
              <button onClick={()=>setShowModal(false)} style={{width:'32px',height:'32px',borderRadius:'8px',border:'none',background:'#F1F5F9',cursor:'pointer',fontSize:'16px'}}>✕</button>
            </div>
            <div style={{padding:'24px 28px'}}>
              <div style={{marginBottom:'20px'}}>
                <p style={{fontSize:'13px',fontWeight:600,color:'#5A7090',marginBottom:'10px'}}>Metode Pembayaran</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:'8px'}}>
                  {PAYMENT_METHODS.map(m=>(
                    <button key={m.id} onClick={()=>setSelectedMethod(m.id)}
                      style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 12px',border:`2px solid ${selectedMethod===m.id?'#1560BD':'#DDE5EF'}`,borderRadius:'10px',background:selectedMethod===m.id?'#E8F0FB':'white',cursor:'pointer',textAlign:'left'}}>
                      <span style={{fontSize:'20px'}}>{m.i}</span>
                      <div><p style={{fontSize:'12px',fontWeight:700,color:'#0D1B2A',margin:0}}>{m.n}</p><p style={{fontSize:'11px',color:'#9EB3C8',margin:0}}>{m.d}</p></div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{background:'#F8FAFC',borderRadius:'12px',padding:'16px',marginBottom:'20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',color:'#5A7090',marginBottom:'8px'}}>
                  <span>Plan {PLANS.find(p=>p.key===selectedPlan)?.name} — {billing==='YEARLY'?'Tahunan':'Bulanan'}</span>
                  <span>Rp {price.toLocaleString('id-ID')}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',color:'#5A7090',marginBottom:'8px'}}>
                  <span>PPN 11%</span><span>Rp {tax.toLocaleString('id-ID')}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:'15px',color:'#0D1B2A',borderTop:'1px solid #DDE5EF',paddingTop:'10px',marginTop:'4px'}}>
                  <span>Total Pembayaran</span><span style={{color:'#1560BD'}}>Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <button onClick={pay} disabled={loading}
                style={{width:'100%',padding:'14px',background:'#1560BD',color:'white',border:'none',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontSize:'15px',marginBottom:'12px',opacity:loading?0.7:1}}>
                {loading?'⏳ Memproses...':'🔒 Bayar Sekarang via Midtrans'}
              </button>
              <p style={{textAlign:'center',fontSize:'12px',color:'#9EB3C8'}}>🔒 Pembayaran aman diproses oleh <strong>Midtrans</strong> — PCI DSS Level 1</p>
            </div>
          </div>
        </div>
      )}
      {toast&&<div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',zIndex:99998,background:toast.type==='ok'?'#0F6E56':'#EF4444',color:'white',padding:'12px 24px',borderRadius:'12px',fontSize:'14px',fontWeight:600,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',whiteSpace:'nowrap'}}>{toast.msg}</div>}
    </div>
  )
}
