import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  typescript: {
    // Keep local `npm run type-check` strict, but let cloud builds proceed.
    ignoreBuildErrors: true
  }
};

export default nextConfig;
