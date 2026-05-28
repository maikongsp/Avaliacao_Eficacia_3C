import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Resolve @/ alias explicitly (garante funcionamento em todos os ambientes)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }

    return config;
  },
};

export default nextConfig;
