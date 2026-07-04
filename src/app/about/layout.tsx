import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tentang Pantau.in — Platform Monitoring Peluang Bisnis Indonesia',
  description: 'Pantau.in adalah platform AI yang memantau ribuan sumber online Indonesia secara real-time dan mengirim notifikasi ke WhatsApp, Telegram, atau Email saat ada peluang bisnis, tender, properti, atau lowongan yang cocok.',
  keywords: 'tentang pantau.in, platform monitoring indonesia, notifikasi peluang bisnis',
  openGraph: {
    title: 'Tentang Pantau.in — Platform Monitoring Peluang Bisnis Indonesia',
    description: 'Pantau.in adalah platform AI yang memantau ribuan sumber online Indonesia secara real-time dan mengirim notifikasi ke WhatsApp, Telegram, atau Email saat ada peluang bisnis, tender, properti, atau lowongan yang cocok.',
    url: 'https://pantau.in/about',
    siteName: 'Pantau.in',
    type: 'website',
  },
  alternates: {
    canonical: 'https://pantau.in/about',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
