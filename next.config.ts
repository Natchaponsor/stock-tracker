import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge overlaps the footer and every design screenshot;
  // it has no effect on production builds.
  devIndicators: false,
  // Dev only: lets the dev server be opened as 127.0.0.1 as well as localhost.
  // They are separate origins with separate storage, which makes them two
  // "devices" for testing device sync against one dev server.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
