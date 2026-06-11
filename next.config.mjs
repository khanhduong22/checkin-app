/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'host',
            value: '(?<vercelHost>.*\\.vercel\\.app)',
          },
        ],
        destination: 'https://limart.khanhdp.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
