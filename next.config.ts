import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    '/api/media/events/*': ['./data/event-media-cache/**/*.jpg'],
    '/api/media/places/*': ['./data/place-media-cache/**/*.jpg'],
  },
  poweredByHeader: false,
  devIndicators: false,
  // Allow only the explicitly selected LAN host for device preview; no wildcard.
  allowedDevOrigins: ["127.0.0.1", ...(process.env.QETTYQ_DEV_LAN_HOST ? [process.env.QETTYQ_DEV_LAN_HOST] : [])],
};

export default nextConfig;
