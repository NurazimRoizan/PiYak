import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_URL: '/',
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_URL: '/',
  }
};

export default nextConfig;
