import { createHash, randomInt, timingSafeEqual } from 'crypto'

export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000
export const OTP_MAX_SENDS_PER_HOUR = 3
export const OTP_MAX_ATTEMPTS = 5
export const OTP_LOCK_MS = 15 * 60 * 1000

// 0812..., 812..., +62812..., 62812... -> 62812... ; null bila bukan nomor HP Indonesia
export function normalizeWaNumber(input: string): string | null {
  const d = String(input || '').replace(/[^0-9]/g, '')
  const n = d.indexOf('62') === 0 ? d : d.indexOf('0') === 0 ? '62' + d.slice(1) : d.indexOf('8') === 0 ? '62' + d : d
  return /^628[0-9]{7,12}$/.test(n) ? n : null
}

export function maskWa(n: string): string {
  return '+62 ' + n.slice(2, 5) + '-••••-' + n.slice(-4)
}

export function generateOtp(): string {
  return ('000000' + randomInt(0, 1000000)).slice(-6)
}

export function hashOtp(code: string, userId: string): string {
  return createHash('sha256').update(code + ':' + userId + ':' + (process.env.NEXTAUTH_SECRET || '')).digest('hex')
}

export function otpMatches(code: string, userId: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code, userId), 'hex')
  const b = Buffer.from(String(hash || ''), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function otpMessage(code: string): string {
  return '*' + code + '* adalah kode verifikasi Pantau.in kamu.\n\n'
    + 'Berlaku 5 menit. Jangan bagikan kode ini ke siapa pun. Tim Pantau.in tidak pernah meminta kode ini.\n\n'
    + '_Bukan kamu yang mendaftar? Abaikan pesan ini._'
}
