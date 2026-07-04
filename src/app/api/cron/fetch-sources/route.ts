import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchSource } from '@/lib/ingest'

export const dynamic = 'force-dynamic'

const CIRCUIT_BREAKER_THRESHOLD = 10  // auto-disable setelah N error berturut-turut
const CONCURRENCY = 5                  // max parallel fetches
const ECO_MODE = true                  // skip jika belum waktunya

async function sendTelegramAlert(msg: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID || '901470999'
    if (!token) return
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
    })
  } catch {}
}

async function processJob(job: any): Promise<{ id: string; status: 'ok'|'skip'|'error'|'disabled'; items: number }> {
  // ECO-MODE: skip jika belum waktunya
  if (ECO_MODE && job.lastRunAt) {
    const msSinceLastRun = Date.now() - new Date(job.lastRunAt).getTime()
    const msInterval = job.intervalMinutes * 60 * 1000
    if (msSinceLastRun < msInterval * 0.9) {
      return { id: job.id, status: 'skip', items: 0 }
    }
  }

  // CIRCUIT BREAKER: skip & disable jika error terlalu banyak
  if (job.errorCount >= CIRCUIT_BREAKER_THRESHOLD) {
    await prisma.scraperJob.update({
      where: { id: job.id },
      data: { isActive: false, status: 'disabled', lastError: `Circuit breaker: ${job.errorCount} errors` }
    })
    await sendTelegramAlert(
      `⚡ <b>Circuit Breaker</b>\nSource <b>${job.source}</b> dinonaktifkan otomatis.\nError count: ${job.errorCount}\nURL: ${job.url}`
    )
    return { id: job.id, status: 'disabled', items: 0 }
  }

  try {
    const count = await fetchSource(job)
    await prisma.scraperJob.update({
      where: { id: job.id },
      data: { status: 'idle', lastRunAt: new Date(), itemsFound: count, lastError: null, errorCount: 0 }
    })
    return { id: job.id, status: 'ok', items: count }
  } catch (e: any) {
    const newErrorCount = job.errorCount + 1
    await prisma.scraperJob.update({
      where: { id: job.id },
      data: { status: 'error', lastRunAt: new Date(), errorCount: { increment: 1 }, lastError: String(e?.message ?? e).slice(0, 500) }
    })
    // Alert jika mendekati threshold
    if (newErrorCount === CIRCUIT_BREAKER_THRESHOLD - 2) {
      await sendTelegramAlert(
        `⚠️ <b>Warning</b>\nSource <b>${job.source}</b> error ${newErrorCount}x.\nAkan dinonaktifkan otomatis pada error ke-${CIRCUIT_BREAKER_THRESHOLD}.`
      )
    }
    return { id: job.id, status: 'error', items: 0 }
  }
}

export async function GET() {
  const jobs = await prisma.scraperJob.findMany({ where: { isActive: true } })

  let totalItems = 0, ok = 0, failed = 0, skipped = 0, disabled = 0

  // Proses dengan concurrency limit
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(processJob))
    for (const r of results) {
      totalItems += r.items
      if (r.status === 'ok') ok++
      else if (r.status === 'error') failed++
      else if (r.status === 'skip') skipped++
      else if (r.status === 'disabled') disabled++
    }
  }

  return NextResponse.json({
    success: true,
    sourcesChecked: jobs.length,
    ok, failed, skipped, disabled,
    newItems: totalItems,
    ecoMode: ECO_MODE,
    circuitBreakerThreshold: CIRCUIT_BREAKER_THRESHOLD,
  })
}
