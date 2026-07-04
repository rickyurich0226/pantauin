import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/superadmin/', '/admin/'],
      },
    ],
    sitemap: 'https://pantau.in/sitemap.xml',
  }
}
