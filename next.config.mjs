/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: "standalone",
  webpack: (config, { isServer }) => {
    // Handle better-sqlite3 native binding
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "better-sqlite3": false,
        "electron": false,
      };
    }
    return config;
  },
};

export default nextConfig;
