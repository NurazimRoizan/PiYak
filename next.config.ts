import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/PiYak',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
