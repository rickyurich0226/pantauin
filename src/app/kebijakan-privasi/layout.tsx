import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi Pantau.in — Perlindungan Data Pengguna',
  description: 'Kebijakan privasi Pantau.in menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi kamu sesuai UU PDP Indonesia.',
  keywords: 'kebijakan privasi pantau.in, perlindungan data, GDPR Indonesia',
  openGraph: {
    title: 'Kebijakan Privasi Pantau.in — Perlindungan Data Pengguna',
    description: 'Kebijakan privasi Pantau.in menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi kamu sesuai UU PDP Indonesia.',
    url: 'https://pantau.in/kebijakan-privasi',
    siteName: 'Pantau.in',
    type: 'website',
  },
  alternates: {
    canonical: 'https://pantau.in/kebijakan-privasi',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
