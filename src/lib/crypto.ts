import crypto from 'crypto'

// AES-256-GCM encryption for sensitive PII (WhatsApp numbers) per UU PDP Indonesia.
// ENCRYPTION_KEY must be a 32-byte (64 hex char) key set in .env, e.g.:
//   openssl rand -hex 32
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY tidak valid. Harus 64 karakter hex (32 byte). Generate dengan: openssl rand -hex 32')
  }
  return Buffer.from(key, 'hex')
}

export function encryptPII(plaintext: string): string {
  if (!plaintext) return ''
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    // Format: iv:authTag:encrypted (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  } catch (err) {
    console.error('[Crypto] Encrypt error:', err)
    return ''
  }
}

export function decryptPII(ciphertext: string): string {
  if (!ciphertext) return ''
  // Data lama tersimpan plaintext (nomor HP / chat ID): kembalikan apa adanya
  if (/^[-+]?[0-9][0-9 +-]{4,19}$/.test(ciphertext.trim())) return ciphertext.trim()
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext || ''
  try {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) return ''
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    console.error('[Crypto] Decrypt error:', err)
    return ''
  }
}

// Content fingerprinting for deduplication (bagian 1 spec)
// Kategori "listing marketplace" — item yang sama dari domain berbeda (mis.
// properti yang sama di OLX vs Rumah123) memang layak dianggap independen,
// karena user mungkin mau tau semua platform yang jual barang itu.
const MARKETPLACE_CATEGORIES = new Set(['PROPERTI', 'KENDARAAN'])

export function buildContentHash(p: { title: string; price?: number | null; location?: string | null; sourceUrl?: string | null; category?: string | null }): string {
  const normalizedTitle = p.title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')       // remove punctuation/symbols
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim()
  const normalizedPrice = p.price ? Math.round(p.price / 1000) * 1000 : 0 // round to nearest 1000 to tolerate minor formatting diffs
  const normalizedLocation = (p.location || '').toLowerCase().trim()
  // Domain HANYA disertakan untuk kategori marketplace. Untuk kategori berita
  // (TENDER, BISNIS, dst), berita yang sama diliput banyak media itu wajar —
  // menyertakan domain di hash membuat dedup gagal mendeteksinya sebagai
  // duplikat, memboroskan kuota notifikasi untuk cerita yang sama persis.
  let normalizedDomain = ''
  if (p.sourceUrl && p.category && MARKETPLACE_CATEGORIES.has(p.category)) {
    try { normalizedDomain = new URL(p.sourceUrl).hostname.replace(/^www\./, '') } catch {}
  }
  const raw = `${normalizedTitle}|${normalizedPrice}|${normalizedLocation}|${normalizedDomain}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}
