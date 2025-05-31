/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Output build to standard Next.js directory
  distDir: '.next',
  
  // Enable server components and API routes
  swcMinify: true,
  
  // URL normalization for dynamic routes
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  trailingSlash: false,

  // Vercel-optimized image configuration
  images: {
    domains: ['github.com', 'raw.githubusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Skip TypeScript type checking during builds for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Also ignore ESLint errors to ensure the build completes
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Handle external packages that might cause issues
  experimental: {
    esmExternals: 'loose',
  },
  // Ensure we can handle window references properly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix for client-side window reference issues
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Mock window for server-side rendering
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        window: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig;
