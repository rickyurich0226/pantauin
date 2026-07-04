// reCAPTCHA v3 (invisible) verification. Score range 0.0 (bot) - 1.0 (human).
// Threshold default 0.5 sesuai rekomendasi Google untuk aksi umum (login, register, form).
// Site Key & Secret Key dikonfigurasi via Super Admin -> Integrasi (env: RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY).
// Jika key belum diisi (placeholder), verifikasi di-skip otomatis (fail-open) supaya tidak mengunci
// akses sebelum admin sempat konfigurasi — TAPI tetap dicatat di audit log sebagai peringatan.

const RECAPTCHA_THRESHOLD = 0.5
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

export interface RecaptchaResult {
  success: boolean
  score?: number
  skipped: boolean
  reason?: string
}

export async function verifyRecaptcha(token: string, action: string): Promise<RecaptchaResult> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  if (!secretKey || secretKey === 'CHANGE_ME_RECAPTCHA_SECRET') {
    console.warn('[reCAPTCHA] Secret key belum dikonfigurasi, verifikasi dilewati (fail-open)')
    return { success: true, skipped: true, reason: 'Secret key belum dikonfigurasi' }
  }

  if (!token) {
    return { success: false, skipped: false, reason: 'Token reCAPTCHA tidak ada' }
  }

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    })
    const data = await res.json()

    if (!data.success) {
      return { success: false, skipped: false, reason: `Verifikasi gagal: ${(data['error-codes'] || []).join(', ')}` }
    }

    // Untuk v3, Google merekomendasikan validasi action name agar token tidak dipakai ulang lintas form
    if (data.action && data.action !== action) {
      return { success: false, skipped: false, reason: `Action mismatch: expected ${action}, got ${data.action}` }
    }

    const score = typeof data.score === 'number' ? data.score : 0
    if (score < RECAPTCHA_THRESHOLD) {
      return { success: false, score, skipped: false, reason: `Skor terlalu rendah: ${score}` }
    }

    return { success: true, score, skipped: false }
  } catch (err) {
    console.error('[reCAPTCHA] Error verifying:', err)
    // Fail-open jika Google API tidak terjangkau, supaya outage pihak ketiga tidak
    // mengunci seluruh sistem login/register. Insiden ini tetap perlu dicatat.
    return { success: true, skipped: true, reason: 'reCAPTCHA API tidak terjangkau' }
  }
}
