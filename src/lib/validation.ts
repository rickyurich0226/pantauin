import { z } from 'zod'

// Semua input dari form (termasuk nomor WhatsApp, keyword filter) divalidasi
// dengan zod di server-side, bukan hanya client-side (spec section 3.2).

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().trim().toLowerCase().email('Format email tidak valid').max(255),
  password: z.string().min(8, 'Password minimal 8 karakter').max(128, 'Password maksimal 128 karakter'),
  phone: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi').regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, 'Format nomor HP tidak valid'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const watchQuerySchema = z.object({
  name: z.string().trim().min(1, 'Nama watch query wajib diisi').max(100),
  category: z.enum(['TENDER', 'PROPERTI', 'KENDARAAN', 'BISNIS', 'INVESTASI', 'LOWONGAN', 'BEASISWA', 'BANTUAN']),
  queryText: z.string().trim().min(1, 'Deskripsi wajib diisi').max(500),
  mustInclude: z.string().trim().max(200).optional(),
  exclude: z.string().trim().max(200).optional(),
  filters: z.record(z.any()).optional(),
  frequency: z.enum(['REALTIME', 'DAILY']).optional(),
})

export const whatsappNumberSchema = z.string()
  .trim()
  .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, 'Format nomor WhatsApp tidak valid. Gunakan format 08xxx atau +628xxx')

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/).optional().or(z.literal('')).optional(),
  whatsapp: z.string().trim().regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/).optional().or(z.literal('')).optional(),
  telegramId: z.string().trim().max(50).optional().or(z.literal('')).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
})

export const paymentSchema = z.object({
  plan: z.enum(['PRO', 'BUSINESS']),
  billing: z.enum(['MONTHLY', 'YEARLY']).optional(),
})

/**
 * Hasil validasi sebagai discriminated union eksplisit (bukan generic inline)
 * supaya TypeScript dapat menyempitkan (narrow) tipe dengan benar setelah
 * pengecekan `if (!parsed.success)` di Next.js strict build.
 */
export type ValidationSuccess<T> = { success: true; data: T; error?: undefined }
export type ValidationFailure = { success: false; error: string; data?: undefined }
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

/**
 * Helper: parse dan validasi body request, kembalikan error response siap pakai jika invalid.
 * Pemakaian:
 *   const parsed = validateBody(registerSchema, await req.json())
 *   if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
 *   const { name, email } = parsed.data
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T, body: unknown): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(body) as z.SafeParseReturnType<unknown, z.infer<T>>
  if (!result.success) {
    // TypeScript's narrowing of generic SafeParseReturnType<T> inside a generic
    // function isn't always reliable, so we assert the failure shape explicitly
    // here. This is safe because `!result.success` has already been verified at
    // runtime — the assertion only tells the compiler what's already true.
    const failure = result as z.SafeParseError<unknown>
    const firstError = failure.error.errors[0]
    return { success: false, error: firstError?.message ?? 'Input tidak valid' }
  }
  return { success: true, data: result.data }
}
