/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "@react-pdf/renderer"],
  },
  allowedDevOrigins: ["phrase-penalty-bullion.ngrok-free.dev"],
};

export default nextConfig;
