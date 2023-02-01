/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  swcMinify: true,

  // compiler: {
  //   //   // ssr and displayName are configured by default
  //   styledComponents: true,
  //   removeConsole: true,
  //   swcMinify: true,
  // },
};

module.exports = nextConfig;
