import { NextResponse } from 'next/server'
import { cleanupOldNotifications } from '@/lib/dedup'

// Wajib: tanpa ini, Next.js mencoba pre-render route ini sebagai halaman statis
// saat `npm run build`, yang akan query database di tahap build — gagal karena
// DATABASE_URL belum tersedia saat itu (baru di-mount saat container runtime).
export const dynamic = 'force-dynamic'

/**
 * Cron harian: hapus Notification lebih dari 90 hari untuk menjaga ukuran tabel
 * (spec section 1 acceptance criteria). Jadwalkan via crontab terpisah dari
 * check-plans dan dispatch-notifications.
 */
export async function GET() {
  const deletedCount = await cleanupOldNotifications()
  return NextResponse.json({ success: true, deletedCount, timestamp: new Date().toISOString() })
}
