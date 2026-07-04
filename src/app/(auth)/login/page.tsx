'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useRecaptcha } from '@/lib/useRecaptcha'

export default function Login() {
  const router = useRouter()
  const { getToken } = useRecaptcha()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [totpToken, setTotpToken] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // Langkah 1: validasi email+password+recaptcha lewat pre-login-check.
  // Jika akun punya 2FA aktif, tampilkan input kode tanpa langsung signIn().
  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr('')

    const recaptchaToken = await getToken('login')

    const res = await fetch('/api/auth/pre-login-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, recaptchaToken }),
    })
    const data = await res.json()

    if (!res.ok || !data.ok) {
      setErr(data.error || 'Email atau password salah')
      setLoading(false)
      return
    }

    if (data.requires2FA) {
      setRequires2FA(true)
      setLoading(false)
      return
    }

    await finalizeSignIn()
  }

  // Langkah 2 (jika punya 2FA): submit kode TOTP bersama credentials ke NextAuth.
  const submitTotp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr('')
    await finalizeSignIn()
  }

  const finalizeSignIn = async () => {
    const recaptchaToken = await getToken('login')
    const res = await signIn('credentials', {
      email, password: pass, totpToken, recaptchaToken, redirect: false,
    })
    if (res?.error) {
      setErr(requires2FA ? 'Kode 2FA salah. Coba lagi.' : 'Email atau password salah')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  const inp = { width: '100%', padding: '12px 14px', border: '1.5px solid #DDE5EF', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}>
      <style>{`@media(max-width:768px){.login-left{display:none!important}.login-right{padding:32px 20px!important}}`}</style>
      <div className="login-left" style={{ background: 'linear-gradient(160deg,#0D1B2A,#1560BD)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",justifyContent:"center",marginBottom:"8px"}}><img src="/logo.png" alt="pantau.in" style={{height:"48px",objectFit:"contain"}}/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'28px',fontWeight:800}}><span style={{color:'#0D1B2A'}}>Pantau</span><span style={{color:'#0F6E56'}}>.in</span></span></div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px' }}>Internet Dipantau. Peluang Dikirim ke WA Kamu.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '48px', width: '100%', maxWidth: '280px' }}>
          {[['Ribuan', 'Sumber'], ['<15mnt', 'Deteksi'], ['24/7', 'Aktif'], ['Gratis', 'Mulai']].map(([v, l]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '22px' }}>{v}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '4px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', background: 'white' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <a href="/" style={{ fontSize: '13px', color: '#5A7090', textDecoration: 'none', display: 'block', marginBottom: '28px' }}>← Beranda</a>

          {!requires2FA ? (
            <>
              <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Selamat Datang</h1>
              <p style={{ color: '#5A7090', marginBottom: '28px', fontSize: '14px' }}>Belum punya akun? <a href="/register" style={{ color: '#1560BD', fontWeight: 600, textDecoration: 'none' }}>Daftar gratis</a></p>
              <button type="button" onClick={()=>signIn('google',{callbackUrl:'/dashboard'})}
                style={{width:'100%',padding:'11px',border:'1.5px solid #DDE5EF',borderRadius:'10px',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600,color:'#0D1B2A',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'12px'}}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Masuk dengan Google
              </button>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
                <div style={{flex:1,height:'1px',background:'#DDE5EF'}}/><span style={{fontSize:'12px',color:'#9EB3C8'}}>atau masuk dengan email</span><div style={{flex:1,height:'1px',background:'#DDE5EF'}}/>
              </div>
              {err && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>{err}</div>}
              <form onSubmit={submitCredentials}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@kamu.com" required style={inp} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Password</label>
                  <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required style={inp} />
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#1560BD', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? '⏳ Memeriksa...' : 'Masuk ke Dashboard →'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>🔐 Verifikasi 2FA</h1>
              <p style={{ color: '#5A7090', marginBottom: '28px', fontSize: '14px' }}>Masukkan kode 6 digit dari aplikasi Google Authenticator kamu.</p>

              {err && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>{err}</div>}
              <form onSubmit={submitTotp}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Kode 6 Digit</label>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                    value={totpToken} onChange={e => setTotpToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456" required autoFocus
                    style={{ ...inp, fontSize: '24px', letterSpacing: '8px', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>
                <button type="submit" disabled={loading || totpToken.length !== 6} style={{ width: '100%', padding: '14px', background: '#1560BD', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', opacity: (loading || totpToken.length !== 6) ? 0.5 : 1 }}>
                  {loading ? '⏳ Memverifikasi...' : 'Verifikasi & Masuk →'}
                </button>
                <button type="button" onClick={() => { setRequires2FA(false); setTotpToken(''); setErr('') }} style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#5A7090', fontSize: '13px', marginTop: '12px', cursor: 'pointer' }}>
                  ← Kembali ke login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
