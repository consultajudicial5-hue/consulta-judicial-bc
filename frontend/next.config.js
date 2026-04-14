/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development'
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
              : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/monitor/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/monitor/:path*`,
      },
      {
        source: '/api/analyze',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/analyze`,
      },
      {
        source: '/api/remates',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/remates`,
      },
      {
        source: '/api/documents/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/documents/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
