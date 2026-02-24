import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1:3100"],
};

export default withPWA({
  dest: "public",
  disable: true,
})(nextConfig);
