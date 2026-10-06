'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// PRO/BUSINESS: banner kuning (mereka membayar untuk WA). FREE: kartu netral, bisa ditutup 7 hari.
export default function WaVerifyBanner({ plan }: { plan: string }) {
  const isPaid = plan !== 'FREE'
  const key = isPaid ? 'waBannerDismissed' : 'waCardDismissedAt'
  const [st, setSt] = useState<{ verified: boolean; hasNumber: boolean } | null>(null)

  useEffect(() => {
    try {
      if (isPaid) { if (sessionStorage.getItem(key)) return }
      else { const t = Number(localStorage.getItem(key) || 0); if (t && Date.now() - t < 7 * 24 * 60 * 60 * 1000) return }
    } catch {}
    fetch('/api/auth/whatsapp-otp/status').then(r => (r.ok ? r.json() : null)).then(d => { if (d && !d.verified) setSt(d) }).catch(() => {})
  }, [isPaid, key])

  if (!st) return null
  const dismiss = () => {
    setSt(null)
    try {
      if (isPaid) sessionStorage.setItem(key, '1')
      else localStorage.setItem(key, String(Date.now()))
    } catch {}
  }
  const href = '/verify-whatsapp?next=' + encodeURIComponent('/dashboard')
  const close = (
    <button type="button" aria-label="Tutup pemberitahuan" onClick={dismiss}
      style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer', color: isPaid ? '#7C3F12' : '#4B5E7A', flexShrink: 0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
    </button>
  )

  if (isPaid) return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '14px 18px', marginBottom: '20px', border: '1px solid #F5C58A', borderRadius: '14px', background: '#FFF8EC' }}>
      <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <strong style={{ fontSize: '15px', color: '#7C2D12' }}>{st.hasNumber ? 'Nomor WhatsApp belum terverifikasi' : 'Tambahkan nomor WhatsApp kamu'}</strong>
        <span style={{ fontSize: '14px', color: '#7C3F12' }}>Notifikasi WhatsApp tidak dikirim sampai nomor kamu diverifikasi. Butuh kurang dari 1 menit.</span>
      </div>
      <Link href={href} style={{ padding: '11px 18px', borderRadius: '10px', background: '#1560BD', color: 'white', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Verifikasi sekarang</Link>
      {close}
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '14px 18px', marginBottom: '20px', border: '1px solid #DDE5EF', borderRadius: '14px', background: 'white' }}>
      <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <strong style={{ fontSize: '15px', color: '#0D1B2A' }}>Siapkan nomor WhatsApp kamu</strong>
        <span style={{ fontSize: '14px', color: '#4B5E7A' }}>Verifikasi sekarang supaya langsung menerima notifikasi instan saat upgrade ke Pro.</span>
      </div>
      <Link href={href} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #C9D4E3', color: '#1560BD', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Verifikasi</Link>
      {close}
    </div>
  )
}
