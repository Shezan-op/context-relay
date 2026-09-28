/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['node:sqlite'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
