/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/api/:path((?!v1).*)",
        destination: "/api/v1/:path*",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
