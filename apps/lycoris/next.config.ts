import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@coinbase/cdp-sdk"],
  // cdp-sdk is external, so its own deps must be traced into the function.
  // uncrypto resolves through bun's store and was packed without its dist.
  outputFileTracingIncludes: {
    "/*": ["../../node_modules/uncrypto/**/*"],
  },
  transpilePackages: ["@repo/ui", "@repo/shared", "@settle-kit/core", "@settle-kit/react"],
};

export default nextConfig;
