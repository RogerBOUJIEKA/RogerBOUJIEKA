import type { NextConfig } from 'next';

const config: NextConfig = {
  // Pages légères : beaucoup de visiteurs arrivent depuis WhatsApp, sur réseau mobile.
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default config;
