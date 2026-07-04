import { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://pantau.in'
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/blog/cara-pantau-tender-lpse-otomatis`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/cara-dapat-notifikasi-properti-murah`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/monitoring-pengadaan-barang-jasa-online`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/cara-pantau-lowongan-kerja-otomatis`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/notifikasi-tender-pemerintah-whatsapp`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/cara-cari-peluang-bisnis-online-indonesia`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/cara-kerja`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/fitur/notifikasi`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/fitur/keyword`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/pusat-bantuan`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/keamanan`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/syarat-dan-ketentuan`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/kebijakan-privasi`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ]
}
