import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  // Allow only the explicitly selected LAN host for device preview; no wildcard.
  allowedDevOrigins: ["127.0.0.1", ...(process.env.QETTYQ_DEV_LAN_HOST ? [process.env.QETTYQ_DEV_LAN_HOST] : [])],
};

export default nextConfig;
