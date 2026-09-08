import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/shared", "@settle-kit/core", "@settle-kit/react"],
};

export default nextConfig;
