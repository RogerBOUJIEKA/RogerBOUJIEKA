import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  // Outil interne : jamais indexé, jamais intégré dans un cadre.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default config;
