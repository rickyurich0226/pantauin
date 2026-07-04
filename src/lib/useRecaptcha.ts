'use client'
import { useEffect, useState, useCallback } from 'react'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

/**
 * Hook untuk integrasi reCAPTCHA v3 (invisible). Memuat script Google sekali,
 * lalu expose fungsi `getToken(action)` untuk dipanggil sebelum submit form.
 *
 * Site Key dikonfigurasi via NEXT_PUBLIC_RECAPTCHA_SITE_KEY (Super Admin -> Integrasi).
 * Jika belum dikonfigurasi (placeholder), getToken() mengembalikan string kosong
 * dan server akan fail-open (lihat lib/recaptcha.ts) — form tetap bisa disubmit
 * normal tanpa reCAPTCHA sampai admin selesai setup key asli.
 */
export function useRecaptcha() {
  const [ready, setReady] = useState(false)
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useEffect(() => {
    if (!siteKey || siteKey === 'CHANGE_ME_RECAPTCHA_SITE') {
      return // belum dikonfigurasi, skip loading script
    }
    if (window.grecaptcha) { setReady(true); return }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.onload = () => {
      window.grecaptcha?.ready(() => setReady(true))
    }
    document.head.appendChild(script)

    return () => { document.head.removeChild(script) }
  }, [siteKey])

  const getToken = useCallback(async (action: string): Promise<string> => {
    if (!ready || !siteKey || !window.grecaptcha) return ''
    try {
      return await window.grecaptcha.execute(siteKey, { action })
    } catch (err) {
      console.error('[reCAPTCHA] Gagal mendapatkan token:', err)
      return ''
    }
  }, [ready, siteKey])

  return { ready, getToken }
}
