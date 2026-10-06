'use client'
import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [form, setForm] = useState({name:'',email:'',password:'',phone:''})
  const [refCode, setRefCode] = useState('')

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) setRefCode(ref.toUpperCase())
  }, [])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr('')
    const res = await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,phone:form.phone||undefined,notifChannels:['EMAIL'],refCode:refCode||undefined})})
    const data = await res.json()
    if (!res.ok) { setErr(data.error||'Gagal mendaftar'); setLoading(false); return }
    // Auto-login setelah register berhasil
    const login = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    if (login?.error) { router.push('/login?registered=1'); return }
    router.push(form.phone ? '/verify-whatsapp?next=' + encodeURIComponent('/dashboard?onboarding=1') : '/dashboard?onboarding=1')
  }

  const inp = {width:'100%',padding:'12px 14px',border:'1.5px solid #DDE5EF',borderRadius:'10px',fontSize:'14px',outline:'none',fontFamily:'inherit'} as React.CSSProperties

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F0F4F9',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'20px',padding:'clamp(24px,4vw,40px)',width:'100%',maxWidth:'min(420px,calc(100vw - 32px))',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
        <a href="/" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none',display:'block',marginBottom:'24px'}}>← Beranda</a>
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",justifyContent:"center"}}><img src="/logo.png" alt="pantau.in" style={{height:"40px",objectFit:"contain"}}/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'24px',fontWeight:800}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></div>
          <h1 style={{fontSize:'22px',fontWeight:800,marginTop:'12px'}}>Buat Akun Gratis</h1>
          <p style={{color:'#5A7090',fontSize:'13px',marginTop:'4px'}}>Sudah punya akun? <a href="/login" style={{color:'#1560BD',fontWeight:600,textDecoration:'none'}}>Masuk</a></p>
          <button type="button" onClick={()=>signIn('google',{callbackUrl:'/complete-profile'})}
            style={{width:'100%',padding:'11px',border:'1.5px solid #DDE5EF',borderRadius:'10px',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600,color:'#0D1B2A',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'12px',marginTop:'16px'}}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Daftar dengan Google
          </button>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
            <div style={{flex:1,height:'1px',background:'#DDE5EF'}}/><span style={{fontSize:'12px',color:'#9EB3C8'}}>atau daftar dengan email</span><div style={{flex:1,height:'1px',background:'#DDE5EF'}}/>
          </div>
        </div>
        {refCode&&<div style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:'10px',padding:'12px 14px',marginBottom:'16px',fontSize:'13px',color:'#0F6E56',display:'flex',gap:'8px',alignItems:'center'}}><span>🎁</span><span>Kamu diundang! Daftar sekarang dan dapatkan bonus hari Pro gratis.</span></div>}
        {err&&<div style={{background:'#FEE2E2',border:'1px solid #FECACA',color:'#991B1B',padding:'12px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px'}}>{err}</div>}
        <form onSubmit={submit}>
          {[['Nama Lengkap','name','text','Nama kamu'],['Email','email','email','email@kamu.com'],['Password','password','password','Min. 8 karakter'],['No. WhatsApp','phone','tel','08xxxxxxxxxx']].map(([label,field,type,ph])=>(
            <div key={field} style={{marginBottom:'14px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'5px'}}>{label}</label>
              <input type={type} placeholder={ph} required minLength={field==='password'?8:undefined}
                value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} style={inp}/>
            </div>
          ))}
          <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',background:'#1560BD',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:700,cursor:'pointer',marginTop:'8px',opacity:loading?0.7:1}}>
            {loading?'⏳ Menyiapkan akun...':'Daftar & Mulai Sekarang →'}
          </button>
        </form>
        <p style={{fontSize:'12px',color:'#9EB3C8',textAlign:'center',marginTop:'16px'}}>
          Dengan mendaftar, kamu menyetujui <a href="/syarat-dan-ketentuan" style={{color:'#1560BD'}}>Syarat & Ketentuan</a> kami.
        </p>
      </div>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F0F4F9'}}><p style={{color:'#9EB3C8'}}>⏳ Memuat...</p></div>}>
      <RegisterForm />
    </Suspense>
  )
}
