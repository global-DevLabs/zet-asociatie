/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Required for Tauri: static export so Tauri can load the built files from out/
  // Note: API routes (app/api/*) will not work with static export.
  // For Tauri build, use @tauri-apps/plugin-sql from the frontend instead.
  ...(process.env.TAURI_ENV_PLATFORM ? { output: 'export' } : {}),
}

export default nextConfig
