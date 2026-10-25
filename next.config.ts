import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge overlaps the footer and every design screenshot;
  // it has no effect on production builds.
  devIndicators: false,
};

export default nextConfig;
