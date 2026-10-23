import path from 'node:path';
import type { NextConfig } from 'next';

// The electron/ package owns node_modules; trace and resolve from there so the
// standalone server lands at .next/standalone/renderer/server.js.
const packageRoot = path.join(__dirname, '..');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: packageRoot,
  turbopack: { root: packageRoot },
  poweredByHeader: false,
  devIndicators: false,
  images: { unoptimized: true },
};

export default nextConfig;
