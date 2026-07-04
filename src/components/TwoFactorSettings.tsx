'use client'
import { useState, useEffect } from 'react'

/**
 * Komponen section "Keamanan Akun" untuk halaman Settings.
 * INI BUKAN FILE PENUH — sisipkan komponen <TwoFactorSettings /> ini ke dalam
 * halaman dashboard/settings/page.tsx yang SUDAH ADA, jangan menimpa file aslinya.
 *
 * Contoh pemakaian di settings/page.tsx:
 *   import TwoFactorSettings from '@/components/TwoFactorSettings'
 *   ...
 *   <TwoFactorSettings />
 */

type SetupStep = 'idle' | 'qr' | 'verify' | 'recovery-codes'

export default function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false)
  const [step, setStep] = useState<SetupStep>('idle')
  const [otpAuthUrl, setOtpAuthUrl] = useState('')
  const [manualSecret, setManualSecret] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => { setEnabled(!!data.twoFactorEnabled); setLoadingStatus(false) })
      .catch(() => setLoadingStatus(false))
  }, [])

  const startSetup = async () => {
    setErr(''); setLoading(true)
    const res = await fetch('/api/user/2fa/setup', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErr(data.error || 'Gagal memulai setup 2FA'); return }
    setOtpAuthUrl(data.otpAuthUrl)
    setManualSecret(data.secret)
    setStep('qr')
  }

  const confirmSetup = async () => {
    setErr(''); setLoading(true)
    const res = await fetch('/api/user/2fa/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErr(data.error || 'Kode salah'); return }
    setRecoveryCodes(data.recoveryCodes)
    setEnabled(true)
    setStep('recovery-codes')
  }

  const disable2FA = async () => {
    setErr(''); setLoading(true)
    const res = await fetch('/api/user/2fa/disable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErr(data.error || 'Gagal menonaktifkan 2FA'); return }
    setEnabled(false)
    setStep('idle')
    setPassword('')
  }

  const qrImageUrl = otpAuthUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpAuthUrl)}`
    : ''

  const card: React.CSSProperties = { background: 'white', border: '1px solid #DDE5EF', borderRadius: '16px', padding: '24px' }
  const btnPrimary: React.CSSProperties = { padding: '12px 20px', background: '#1560BD', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }
  const btnDanger: React.CSSProperties = { padding: '12px 20px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }
  const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #DDE5EF', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }

  if (loadingStatus) return <div style={card}>Memuat status keamanan...</div>

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>🔐 Autentikasi Dua Faktor (2FA)</h3>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px',
          background: enabled ? '#E1F5EE' : '#F1F5F9', color: enabled ? '#0F6E56' : '#5A7090',
        }}>
          {enabled ? 'AKTIF' : 'NONAKTIF'}
        </span>
      </div>
      <p style={{ color: '#5A7090', fontSize: '13px', marginBottom: '20px' }}>
        Tambahkan lapisan keamanan ekstra dengan Google Authenticator. Opsional, tapi sangat disarankan.
      </p>

      {err && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>{err}</div>}

      {step === 'idle' && !enabled && (
        <button onClick={startSetup} disabled={loading} style={btnPrimary}>
          {loading ? '⏳ Memuat...' : 'Aktifkan 2FA'}
        </button>
      )}

      {step === 'idle' && enabled && (
        <div>
          <p style={{ fontSize: '13px', color: '#5A7090', marginBottom: '12px' }}>
            Masukkan password untuk menonaktifkan 2FA.
          </p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password kamu" style={{ ...inp, marginBottom: '12px' }} />
          <button onClick={disable2FA} disabled={loading || !password} style={btnDanger}>
            {loading ? '⏳ Memproses...' : 'Nonaktifkan 2FA'}
          </button>
        </div>
      )}

      {step === 'qr' && (
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>1. Scan QR code ini dengan Google Authenticator:</p>
          {qrImageUrl && <img src={qrImageUrl} alt="QR Code 2FA" style={{ borderRadius: '12px', border: '1px solid #DDE5EF', marginBottom: '12px' }} />}
          <p style={{ fontSize: '12px', color: '#5A7090', marginBottom: '4px' }}>Tidak bisa scan? Masukkan kode ini manual:</p>
          <code style={{ display: 'block', background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', wordBreak: 'break-all', marginBottom: '20px' }}>{manualSecret}</code>

          <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>2. Masukkan kode 6 digit yang muncul di aplikasi:</p>
          <input
            type="text" inputMode="numeric" maxLength={6} value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            style={{ ...inp, fontSize: '20px', letterSpacing: '6px', textAlign: 'center', fontWeight: 700, marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={confirmSetup} disabled={loading || code.length !== 6} style={btnPrimary}>
              {loading ? '⏳ Memverifikasi...' : 'Konfirmasi & Aktifkan'}
            </button>
            <button onClick={() => { setStep('idle'); setCode(''); setErr('') }} style={{ ...btnDanger, background: '#F1F5F9', color: '#5A7090' }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {step === 'recovery-codes' && (
        <div>
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', margin: 0 }}>⚠️ Simpan kode pemulihan ini sekarang!</p>
            <p style={{ fontSize: '12px', color: '#92400E', margin: '4px 0 0' }}>Kode ini hanya ditampilkan SEKALI. Gunakan jika kehilangan akses ke aplikasi authenticator.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            {recoveryCodes.map((c, i) => (
              <code key={i} style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>{c}</code>
            ))}
          </div>
          <button onClick={() => setStep('idle')} style={btnPrimary}>Saya Sudah Menyimpannya</button>
        </div>
      )}
    </div>
  )
}
