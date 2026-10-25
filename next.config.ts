import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fixture.supabase.co')
          .hostname,
        pathname: '/storage/v1/object/public/catalogue/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
const nextConfig = (phase: string): NextConfig => ({
  ...config,
  distDir:
    phase === 'phase-development-server'
      ? process.env.RAJVYA_LOCAL_PREVIEW === '1'
        ? '.next-local'
        : '.next-dev'
      : '.next',
});
export default nextConfig;
