import type { Metadata, Viewport } from 'next'
import './globals.css'

const BASE_URL = 'https://pantau.in'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Pantau.in — Internet Indonesia Dipantau, Peluang Dikirim ke WA Kamu',
    template: '%s | Pantau.in',
  },
  description: 'Pantau.in memindai ribuan sumber online secara real-time dan mengirim notifikasi ke WhatsApp, Email, atau Telegram begitu ada informasi yang cocok dengan kata kunci kamu.',
  keywords: ['tender pengadaan', 'properti murah', 'peluang bisnis', 'monitoring otomatis', 'notifikasi tender', 'LPSE', 'pantau tender', 'agregator peluang'],
  authors: [{ name: 'Pantau.in', url: BASE_URL }],
  creator: 'Pantau.in',
  publisher: 'Pantau.in',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: BASE_URL,
    siteName: 'Pantau.in',
    title: 'Pantau.in — Internet Indonesia Dipantau, Peluang Dikirim ke WA Kamu',
    description: 'Sistem intelijen peluang berbasis AI — pantau internet Indonesia, terima alert di WhatsApp.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Pantau.in — Super App Agregator Peluang' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pantau.in — Internet Indonesia Dipantau, Peluang Dikirim ke WA Kamu',
    description: 'Sistem intelijen peluang berbasis AI — pantau internet Indonesia, terima alert di WhatsApp.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: BASE_URL,
  },
}

export const viewport: Viewport = {
  themeColor: '#1560BD',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
        <link rel="icon" href="/logo.png" type="image/png"/>
        <link rel="apple-touch-icon" href="/logo.png"/>
      </head>
      <body>{children}</body>
    </html>
  )
}
