import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Run ESLint during build to catch errors
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Skip TypeScript checks during build (use `pnpm types:check` separately)
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
