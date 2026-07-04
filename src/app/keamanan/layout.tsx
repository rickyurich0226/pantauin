import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Keamanan Data Pantau.in — Enkripsi & Privasi Terjamin',
  description: 'Data kamu dilindungi dengan enkripsi AES-256, tidak dijual ke pihak ketiga, dan sesuai UU PDP Indonesia. Pelajari bagaimana Pantau.in menjaga keamanan informasi pribadimu.',
  keywords: 'keamanan data pantau.in, enkripsi, privasi, UU PDP',
  openGraph: {
    title: 'Keamanan Data Pantau.in — Enkripsi & Privasi Terjamin',
    description: 'Data kamu dilindungi dengan enkripsi AES-256, tidak dijual ke pihak ketiga, dan sesuai UU PDP Indonesia. Pelajari bagaimana Pantau.in menjaga keamanan informasi pribadimu.',
    url: 'https://pantau.in/keamanan',
    siteName: 'Pantau.in',
    type: 'website',
  },
  alternates: {
    canonical: 'https://pantau.in/keamanan',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
