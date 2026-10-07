import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

const config: NextConfig = {
  // Pages légères : beaucoup de visiteurs arrivent depuis WhatsApp, sur réseau mobile.
  poweredByHeader: false,
  // Image Docker autonome : seul le nécessaire est copié (voir le Dockerfile à la racine).
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  images: { unoptimized: true },
};

export default config;
