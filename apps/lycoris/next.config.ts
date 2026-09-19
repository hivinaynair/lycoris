import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@coinbase/cdp-sdk"],
  // cdp-sdk is external, so node resolves its deps at runtime. uncrypto is
  // traced but did not get packed into the function; force it in.
  outputFileTracingIncludes: {
    "/*": ["../../node_modules/uncrypto/**/*"],
  },
  transpilePackages: ["@repo/ui", "@repo/shared", "@settle-kit/core", "@settle-kit/react"],
};

export default nextConfig;
