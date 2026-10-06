import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchSource } from '@/lib/ingest'
import { requireCronSecret } from '@/lib/cronAuth'

export const dynamic = 'force-dynamic'

const CIRCUIT_BREAKER_THRESHOLD = 20  // auto-disable setelah N error berturut-turut
const CONCURRENCY = 5                  // max parallel fetches
const ECO_MODE = false                  // skip jika belum waktunya

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

// Cooldown Google News: begitu 1 feed Google membalas 503/429, SEMUA feed Google dilewati 30 menit.
// Mencegah terus membombardir Google saat IP sedang dibatasi (insiden 28 Sep 2026).
let googleCooldownUntil = 0
const GOOGLE_COOLDOWN_MS = 30 * 60 * 1000
const isGoogle = (url: string) => /news\.google\.com/i.test(url || '')
const isRateLimit = (e: any) => /\b(503|429)\b/.test(String(e?.message ?? e))

async function processJob(job: any): Promise<{ id: string; status: 'ok'|'skip'|'error'|'disabled'; items: number }> {
  // Hormati intervalMinutes per-source: jangan fetch ulang sebelum jatuh tempo.
  // Tanpa ini, semua sumber (termasuk yang intervalnya 30/60 menit) dipaksa
  // dicek tiap 5 menit oleh cron, membanjiri domain seperti news.google.com
  // dengan ratusan request bersamaan dan memicu blokir sementara (HTTP 503/429).
  if (job.lastRunAt) {
    const msSinceLastRun = Date.now() - new Date(job.lastRunAt).getTime()
    const msInterval = job.intervalMinutes * 60 * 1000
    if (msSinceLastRun < msInterval * 0.9) {
      return { id: job.id, status: 'skip', items: 0 }
    }
  }

  if (isGoogle(job.url) && Date.now() < googleCooldownUntil) {
    return { id: job.id, status: 'skip', items: 0 }
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
    // Rate-limit (503/429) = masalah sementara di sisi sumber, bukan sumber rusak: jangan naikkan errorCount
    if (isRateLimit(e)) {
      if (isGoogle(job.url)) googleCooldownUntil = Date.now() + GOOGLE_COOLDOWN_MS
      await prisma.scraperJob.update({ where: { id: job.id }, data: { status: 'error', lastRunAt: new Date(), lastError: String(e?.message ?? e).slice(0, 500) } })
      return { id: job.id, status: 'error', items: 0 }
    }
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

// Guard outage: cek koneksi internet VPS sebelum fetch, supaya outage jaringan
// tidak dihitung sebagai error source (insiden 24-26 Sep 2026: semua source mati)
async function hasInternet(): Promise<boolean> {
  const probes = ['https://www.google.com/generate_204', 'https://1.1.1.1/cdn-cgi/trace']
  for (const url of probes) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5000)
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(t)
      if (res.status < 500) return true
    } catch {}
  }
  return false
}

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied
  if (!(await hasInternet())) {
    return NextResponse.json({ success: false, networkDown: true, message: 'Koneksi internet VPS terputus, fetch dilewati' })
  }
  const jobs = await prisma.scraperJob.findMany({ where: { isActive: true } })
  // Saring di depan: hanya source jatuh tempo & tidak sedang cooldown yang masuk antrean,
  // urut dari yang paling lama belum di-fetch, dibatasi per run supaya run selesai jauh di bawah 5 menit.
  const nowMs = Date.now()
  const MAX_PER_RUN = Number(process.env.FETCH_MAX_PER_RUN || 250)
  const lastMs = (j: any) => (j.lastRunAt ? new Date(j.lastRunAt).getTime() : 0)
  const dueJobs = jobs
    .filter((j: any) => !j.lastRunAt || nowMs - lastMs(j) >= j.intervalMinutes * 60 * 1000 * 0.9)
    .filter((j: any) => !(isGoogle(j.url) && nowMs < googleCooldownUntil))
    .sort((a: any, b: any) => lastMs(a) - lastMs(b))
    .slice(0, MAX_PER_RUN)

  let totalItems = 0, ok = 0, failed = 0, skipped = jobs.length - dueJobs.length, disabled = 0
  const failedIds: string[] = []

  // Proses dengan concurrency limit + jeda antar-batch supaya tidak
  // membanjiri satu domain (mis. news.google.com) dengan request beruntun
  // tanpa jeda, yang bisa memicu rate-limiting dari sisi domain sumber.
  const BATCH_DELAY_MS = 800
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  for (let i = 0; i < dueJobs.length; i += CONCURRENCY) {
    const batch = dueJobs.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(processJob))
    for (const r of results) {
      totalItems += r.items
      if (r.status === 'ok') ok++
      else if (r.status === 'error') { failed++; failedIds.push(r.id) }
      else if (r.status === 'skip') skipped++
      else if (r.status === 'disabled') disabled++
    }
    if (i + CONCURRENCY < dueJobs.length) await sleep(BATCH_DELAY_MS)
  }

  // Guard ratio: 0 sukses & banyak gagal = masalah jaringan global, bukan source rusak
  let errorCountReverted = false
  if (ok === 0 && failed >= 20) {
    await prisma.scraperJob.updateMany({ where: { id: { in: failedIds }, errorCount: { gt: 0 } }, data: { errorCount: { decrement: 1 } } })
    errorCountReverted = true
    await sendTelegramAlert(`🌐 <b>Fetch gagal massal</b>\n${failed} source gagal, 0 sukses.\nKemungkinan masalah jaringan VPS, errorCount tidak dihitung.`)
  }

  return NextResponse.json({
    success: true,
    sourcesChecked: jobs.length,
    ok, failed, skipped, disabled,
    newItems: totalItems,
    ecoMode: ECO_MODE,
    circuitBreakerThreshold: CIRCUIT_BREAKER_THRESHOLD,
    errorCountReverted,
  })
}
