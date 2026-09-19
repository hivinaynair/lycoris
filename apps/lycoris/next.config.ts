import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@coinbase/cdp-sdk"],
  transpilePackages: ["@repo/ui", "@repo/shared", "@settle-kit/core", "@settle-kit/react"],
};

export default nextConfig;
