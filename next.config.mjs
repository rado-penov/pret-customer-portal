/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs"],
  },
  allowedDevOrigins: ["phrase-penalty-bullion.ngrok-free.dev"],
};

export default nextConfig;
