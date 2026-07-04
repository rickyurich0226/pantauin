import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Lupa Password',
  description: 'Reset password akun Pantau.in kamu. Masukkan email dan kami kirimkan instruksi reset.',
  robots: { index: false, follow: false },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
