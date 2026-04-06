/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['notra24.com', 'localhost:3000'],
    },
  },
};

export default nextConfig;
