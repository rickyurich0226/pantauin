import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Buat password baru untuk akun Pantau.in kamu.',
  robots: { index: false, follow: false },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
