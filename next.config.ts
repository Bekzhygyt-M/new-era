import type { NextConfig } from 'next';

const config: NextConfig = {
  // Emits a self-contained server bundle, so the runtime image ships only what
  // it actually needs instead of the whole node_modules tree.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Lint is run explicitly via `npm run lint`; a lint warning must not
    // silently fail a production build.
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

export default config;
