import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ Pantau.in — Pertanyaan yang Sering Diajukan',
  description: 'Temukan jawaban atas pertanyaan umum seputar Pantau.in: cara kerja, harga, notifikasi WhatsApp, keamanan data, dan cara memulai memantau peluang bisnis di Indonesia.',
  keywords: 'faq pantau.in, pertanyaan pantau.in, cara kerja monitoring otomatis',
  openGraph: {
    title: 'FAQ Pantau.in — Pertanyaan yang Sering Diajukan',
    description: 'Temukan jawaban atas pertanyaan umum seputar Pantau.in: cara kerja, harga, notifikasi WhatsApp, keamanan data, dan cara memulai memantau peluang bisnis di Indonesia.',
    url: 'https://pantau.in/faq',
    siteName: 'Pantau.in',
    type: 'website',
  },
  alternates: {
    canonical: 'https://pantau.in/faq',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
