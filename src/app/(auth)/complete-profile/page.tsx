'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function CompleteProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [form, setForm] = useState({ phone: '', whatsapp: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!form.phone || !form.whatsapp) { setError('Semua field wajib diisi'); return }
    setLoading(true)
    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (res.ok) {
      await update()
      router.push('/verify-whatsapp?next=' + encodeURIComponent('/dashboard?onboarding=1'))
    } else {
      setError(data.error || 'Gagal menyimpan')
      setLoading(false)
    }
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid #DDE5EF', borderRadius: '10px', fontSize: '15px', outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0D1B2A,#1560BD)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: 'min(420px,calc(100vw - 32px))', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <img src="/logo.png" alt="pantau.in" style={{ height: '32px' }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '20px', fontWeight: 800 }}>
            <span style={{ color: '#0D1B2A' }}>Pantau</span><span style={{ color: '#0F6E56' }}>.in</span>
          </span>
        </div>

        <div style={{ background: '#E1F5EE', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#0F6E56', margin: 0 }}>Akun Google terhubung!</p>
            <p style={{ fontSize: '12px', color: '#0F6E56', margin: 0 }}>{session?.user?.email}</p>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>Lengkapi profil</h2>
        <p style={{ fontSize: '14px', color: '#5A7090', margin: '0 0 24px' }}>Isi nomor kontak untuk menerima notifikasi peluang</p>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>No. WhatsApp <span style={{ color: '#EF4444' }}>*</span></label>
            <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="08xx-xxxx-xxxx" style={inp} />
            <p style={{ fontSize: '12px', color: '#9EB3C8', margin: '4px 0 0' }}>Untuk notifikasi peluang via WhatsApp</p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>No. Telepon <span style={{ color: '#EF4444' }}>*</span></label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xx-xxxx-xxxx" style={inp} />
          </div>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: '13px', margin: '12px 0 0' }}>⚠️ {error}</p>}

        <button onClick={submit} disabled={loading} style={{ width: '100%', padding: '13px', background: '#1560BD', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '15px', marginTop: '20px' }}>
          {loading ? '⏳ Menyimpan...' : 'Mulai pantau peluang →'}
        </button>
      </div>
    </div>
  )
}
