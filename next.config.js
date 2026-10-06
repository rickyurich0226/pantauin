/** @type {import('next').NextConfig} */
module.exports = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/code', destination: '/', permanent: true },
    ]
  },
  async headers() {
    return [{ source:'/(.*)', headers:[
      {key:'X-Frame-Options',value:'SAMEORIGIN'},
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-XSS-Protection',value:'1; mode=block'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    ]}]
  },
}
