import { authenticator } from 'otplib'
import { encryptPII, decryptPII } from './crypto'

// Google Authenticator-compatible TOTP (RFC 6238), via otplib.
// Secret disimpan terenkripsi AES-256 di database (PII sensitif, sama seperti nomor WA).

authenticator.options = { window: 1 } // toleransi ±1 step (30 detik) untuk clock drift

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

export function buildOtpAuthUrl(params: { email: string; secret: string; issuer?: string }): string {
  const issuer = params.issuer ?? 'Pantau.in'
  return authenticator.keyuri(params.email, issuer, params.secret)
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch (err) {
    console.error('[TOTP] Verify error:', err)
    return false
  }
}

export function encryptTotpSecret(secret: string): string {
  return encryptPII(secret)
}

export function decryptTotpSecret(encrypted: string): string {
  return decryptPII(encrypted)
}

/**
 * Generate 8 kode pemulihan (recovery codes) sekali pakai, untuk kondisi
 * user kehilangan akses ke aplikasi authenticator-nya. Disimpan ter-hash
 * (bukan plaintext) di database, dibandingkan saat dipakai seperti password.
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`)
  }
  return codes
}
