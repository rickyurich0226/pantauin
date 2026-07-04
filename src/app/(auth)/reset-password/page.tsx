'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [valid, setValid] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!token) { setVerifying(false); setValid(false); return }
    fetch('/api/auth/reset-password/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(r => r.json()).then(d => {
      setValid(d.valid === true)
      setVerifying(false)
    }).catch(() => { setValid(false); setVerifying(false) })
  }, [token])

  const submit = async () => {
    setError('')
    if (password.length < 8) return setError('Password minimal 8 karakter')
    if (password !== confirm) return setError('Password tidak cocok')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setError(data.error || 'Gagal reset password. Coba lagi.')
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #DDE5EF',
    borderRadius: '10px', fontSize: '15px', outline: 'none',
    fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' as const,
  }

  if (verifying) return (
    <div style={{ textAlign: 'center', padding: '48px', color: '#5A7090' }}>⏳ Memverifikasi link...</div>
  )

  if (!token || !valid) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
      <h2 style={{ color: '#0D1B2A', marginBottom: '8px' }}>Link Tidak Valid</h2>
      <p style={{ color: '#5A7090', marginBottom: '24px', fontSize: '14px' }}>
        Link reset password sudah kadaluarsa atau tidak valid. Silakan minta link baru.
      </p>
      <Link href="/forgot-password" style={{ background: '#1560BD', color: 'white', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
        Minta Link Baru →
      </Link>
    </div>
  )

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
      <h2 style={{ color: '#0D1B2A', marginBottom: '8px' }}>Password Berhasil Direset!</h2>
      <p style={{ color: '#5A7090', marginBottom: '8px', fontSize: '14px' }}>Password baru kamu sudah aktif.</p>
      <p style={{ color: '#9EB3C8', fontSize: '13px' }}>Mengalihkan ke halaman login...</p>
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Password Baru</label>
        <div style={{ position: 'relative' }}>
          <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter" style={{ ...inp, paddingRight: '44px' }} />
          <button onClick={() => setShow(!show)} type="button"
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9EB3C8' }}>
            {show ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Konfirmasi Password</label>
        <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Ulangi password baru" style={inp} />
      </div>
      {password && (
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { label: '8+ karakter', ok: password.length >= 8 },
            { label: 'Huruf besar', ok: /[A-Z]/.test(password) },
            { label: 'Angka', ok: /[0-9]/.test(password) },
          ].map(({ label, ok }) => (
            <span key={label} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: ok ? '#E1F5EE' : '#F1F5F9', color: ok ? '#0F6E56' : '#9EB3C8', fontWeight: 600 }}>
              {ok ? '✓' : '○'} {label}
            </span>
          ))}
        </div>
      )}
      {error && <p style={{ color: '#EF4444', fontSize: '13px', margin: 0 }}>{error}</p>}
      <button onClick={submit} disabled={loading}
        style={{ padding: '13px', background: '#1560BD', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
        {loading ? '⏳ Menyimpan...' : '🔐 Simpan Password Baru'}
      </button>
      <Link href="/login" style={{ textAlign: 'center', color: '#5A7090', fontSize: '13px', textDecoration: 'none' }}>← Kembali ke Login</Link>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: 'clamp(24px,4vw,40px) clamp(20px,3vw,36px)', width: '100%', maxWidth: 'min(420px,calc(100vw - 32px))', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0D1B2A', marginBottom: '8px' }}>Buat Password Baru</h1>
          <p style={{ color: '#5A7090', fontSize: '14px' }}>Masukkan password baru untuk akun kamu.</p>
        </div>
        <Suspense fallback={<div style={{ textAlign: 'center', color: '#9EB3C8' }}>⏳ Memuat...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
