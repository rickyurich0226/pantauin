'use client'
import React, { useEffect, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const C = { navy: '#0D1B2A', blue: '#1560BD', teal: '#0F6E56', tealBg: '#E3F3EE', muted: '#4B5E7A', line: '#C9D4E3', err: '#B42318' }
const EMPTY = ['', '', '', '', '', '']

function VerifyWhatsApp() {
  const router = useRouter()
  const params = useSearchParams()
  const rawNext = params.get('next') || '/dashboard'
  const next = rawNext.indexOf('/') === 0 && rawNext.indexOf('//') !== 0 ? rawNext : '/dashboard'
  const [phase, setPhase] = useState<'loading' | 'number' | 'code' | 'done'>('loading')
  const [masked, setMasked] = useState('')
  const [plan, setPlan] = useState('FREE')
  const [phone, setPhone] = useState('')
  const [digits, setDigits] = useState<string[]>(EMPTY)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const started = useRef(false)
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function send(newPhone?: string) {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/auth/whatsapp-otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPhone ? { phone: newPhone } : {}) })
      const d = await r.json().catch(() => ({}))
      if (r.status === 401) { router.push('/login'); return }
      if (d.maskedPhone) setMasked(d.maskedPhone)
      if (d.retryAfter) setCooldown(d.retryAfter)
      if (r.ok) {
        setPhase('code'); setCooldown(d.resendIn || 60); setDigits(EMPTY)
        setTimeout(() => { if (refs.current[0]) refs.current[0].focus() }, 50)
      } else if (d.pending) {
        setPhase('code')
      } else {
        setErr(d.error || 'Gagal mengirim kode')
        if (r.status === 400 || r.status === 502) setPhase('number')
      }
    } finally { setBusy(false) }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    fetch('/api/auth/whatsapp-otp/status').then(r => (r.status === 401 ? null : r.json())).then(d => {
      if (!d) { router.push('/login'); return }
      setPlan(d.plan || 'FREE')
      if (d.verified) { setMasked(d.maskedPhone || ''); setPhase('done'); return }
      if (!d.hasNumber) { setPhase('number'); return }
      setMasked(d.maskedPhone || '')
      send()
    }).catch(() => setPhase('number'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setDigit(i: number, v: string) {
    const clean = v.replace(/[^0-9]/g, '')
    if (clean.length > 1) {
      const nd = EMPTY.slice()
      clean.slice(0, 6).split('').forEach((c, k) => { nd[k] = c })
      setDigits(nd)
      const idx = Math.min(clean.length, 5)
      if (refs.current[idx]) refs.current[idx]!.focus()
      return
    }
    const nd = digits.slice(); nd[i] = clean; setDigits(nd)
    if (clean && i < 5 && refs.current[i + 1]) refs.current[i + 1]!.focus()
  }

  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0 && refs.current[i - 1]) refs.current[i - 1]!.focus()
    if (e.key === 'Enter') verify()
  }

  async function verify() {
    const code = digits.join('')
    if (code.length !== 6) { setErr('Masukkan 6 digit kode'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/auth/whatsapp-otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const d = await r.json().catch(() => ({}))
      if (r.ok) { if (d.maskedPhone) setMasked(d.maskedPhone); setPhase('done') }
      else { setErr(d.error || 'Verifikasi gagal'); if (d.expired || d.locked) setDigits(EMPTY) }
    } finally { setBusy(false) }
  }

  const wrap: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#F4F7FB', color: C.navy }
  const card: React.CSSProperties = { width: '100%', maxWidth: '420px', background: 'white', border: '1px solid #DDE5EF', borderRadius: '16px', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }
  const btn: React.CSSProperties = { width: '100%', height: '50px', border: 'none', borderRadius: '10px', background: C.blue, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.7 : 1 }
  const link: React.CSSProperties = { background: 'none', border: 'none', color: C.blue, fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '8px', minHeight: '40px' }
  const errBox = err ? <div role="alert" style={{ color: C.err, fontSize: '14px', fontWeight: 600 }}>{err}</div> : null

  if (phase === 'loading') return <div style={wrap}><div style={card}><p style={{ margin: 0, color: C.muted }}>Menyiapkan verifikasi...</p></div></div>

  if (phase === 'done') return (
    <div style={wrap}><div style={{ ...card, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: C.tealBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </div>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>WhatsApp terverifikasi</h1>
      <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.55, color: C.muted }}>Nomor <strong style={{ color: C.navy }}>{masked}</strong> sudah terhubung ke akun Pantau.in kamu.</p>
      {plan === 'FREE' && (
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: C.muted }}>Paket Free menerima notifikasi via email. <Link href="/dashboard/upgrade" style={{ color: C.blue, fontWeight: 700 }}>Upgrade ke Pro</Link> untuk notifikasi instan ke WhatsApp.</p>
      )}
      <button type="button" style={btn} onClick={() => router.push('/dashboard/watches')}>Buat pantauan pertama</button>
      <button type="button" style={link} onClick={() => router.push(next)}>Ke dashboard</button>
    </div></div>
  )

  if (phase === 'number') return (
    <div style={wrap}><div style={card}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Nomor WhatsApp kamu</h1>
      <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.5, color: C.muted }}>Kami kirim kode 6 digit lewat WhatsApp untuk memastikan nomor aktif.</p>
      <label htmlFor="wa" style={{ fontSize: '14px', fontWeight: 600 }}>Nomor WhatsApp</label>
      <input id="wa" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0812 3456 7890"
        style={{ height: '48px', padding: '0 14px', border: '1px solid ' + C.line, borderRadius: '10px', fontSize: '16px' }} />
      {errBox}
      <button type="button" style={btn} disabled={busy || !phone} onClick={() => send(phone)}>{busy ? 'Mengirim...' : 'Kirim kode'}</button>
      <button type="button" style={link} onClick={() => router.push(next)}>Lewati, verifikasi nanti</button>
    </div></div>
  )

  return (
    <div style={wrap}><div style={card}>
      <button type="button" style={{ ...link, alignSelf: 'flex-start', padding: '0' }} onClick={() => { setErr(''); setPhase('number') }}>Ubah nomor</button>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Cek WhatsApp kamu</h1>
      <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.55, color: C.muted }}>Kode 6 digit dikirim ke <strong style={{ color: C.navy }}>{masked}</strong> dari nomor resmi Pantau.in.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px' }}>
        {digits.map((d, i) => (
          <input key={i} ref={el => { refs.current[i] = el }} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={'Digit ' + (i + 1)} aria-invalid={!!err} maxLength={6}
            onChange={e => setDigit(i, e.target.value)} onKeyDown={e => onKey(i, e)}
            style={{ height: '54px', width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: '22px', fontWeight: 700, border: (err ? '2px solid ' + C.err : '1px solid ' + C.line), borderRadius: '10px' }} />
        ))}
      </div>
      {errBox}
      <button type="button" style={btn} disabled={busy} onClick={verify}>{busy ? 'Memeriksa...' : 'Verifikasi'}</button>
      <div style={{ textAlign: 'center', fontSize: '14px', color: C.muted }}>
        {cooldown > 0
          ? <span>Tidak menerima kode? Kirim ulang dalam <strong style={{ color: C.navy }}>{Math.floor(cooldown / 60)}:{('0' + (cooldown % 60)).slice(-2)}</strong></span>
          : <button type="button" style={link} disabled={busy} onClick={() => send()}>Kirim ulang kode</button>}
      </div>
      <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#F4F7FB', fontSize: '13px', lineHeight: 1.5, color: '#3B4D68' }}>
        Kode berlaku 5 menit. Jangan bagikan kode ini ke siapa pun, termasuk yang mengaku tim Pantau.in.
      </div>
      <button type="button" style={link} onClick={() => router.push(next)}>Lewati, verifikasi nanti</button>
    </div></div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><VerifyWhatsApp /></Suspense>
}
