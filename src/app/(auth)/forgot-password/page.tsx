'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!email) return setError('Email wajib diisi')
    setLoading(true)
    setError('')
    try {
      // Selalu tampilkan success untuk keamanan (tidak reveal apakah email terdaftar)
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
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

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: 'clamp(24px,4vw,40px) clamp(20px,3vw,36px)', width: '100%', maxWidth: 'min(420px,calc(100vw - 32px))', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0D1B2A', marginBottom: '8px' }}>Lupa Password?</h1>
          <p style={{ color: '#5A7090', fontSize: '14px', lineHeight: 1.6 }}>
            Masukkan email kamu dan kami akan kirimkan instruksi reset password.
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#E1F5EE', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📧</div>
              <p style={{ color: '#0F6E56', fontWeight: 700, marginBottom: '4px' }}>Email terkirim!</p>
              <p style={{ color: '#5A7090', fontSize: '13px' }}>
                Jika email <strong>{email}</strong> terdaftar, instruksi reset password sudah dikirim. Cek inbox atau folder spam.
              </p>
            </div>
            <Link href="/login" style={{ display: 'block', textAlign: 'center', color: '#1560BD', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
              ← Kembali ke Login
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0D1B2A' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="email@kamu.com"
                style={inp}
              />
            </div>
            {error && <p style={{ color: '#EF4444', fontSize: '13px', margin: 0 }}>{error}</p>}
            <button
              onClick={submit}
              disabled={loading}
              style={{ padding: '13px', background: '#1560BD', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}
            >
              {loading ? '⏳ Mengirim...' : '📧 Kirim Instruksi Reset'}
            </button>
            <Link href="/login" style={{ textAlign: 'center', color: '#5A7090', fontSize: '13px', textDecoration: 'none' }}>
              ← Kembali ke Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
