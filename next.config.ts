import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Core configuration
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/msaber-tenant-demo/**',
      },
      {
        protocol: 'https',
        hostname: 'vfhchlxfmlytylyiglwf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    domains: ['localhost'],
    unoptimized: false
  },

  // Webpack configuration for external dependencies
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },

  // API proxy configuration
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // Optional redirects for authentication
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'supabase-auth-token',
            value: '(?<token>.*)',
          },
        ],
      },
    ];
  },
}

export default nextConfig
