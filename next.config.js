/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // enable static export for cPanel
  images: { unoptimized: true },
};

module.exports = nextConfig;
