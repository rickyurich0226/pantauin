import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat dan ketentuan penggunaan layanan Pantau.in. Baca sebelum menggunakan platform kami.',
  robots: { index: true, follow: false },
  alternates: { canonical: 'https://pantau.in/syarat-dan-ketentuan' },
  openGraph: { url: 'https://pantau.in/syarat-dan-ketentuan', title: 'Syarat & Ketentuan Pantau.in' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
