import type { NextConfig } from 'next';
import path from 'path';

const isDev = process.env.USE_LOCAL_SRC === 'true';

const nextConfig: NextConfig = {
	webpack: (config) => {
		// Alias cedar to either source or built files
		config.resolve.alias['cedar-os'] = isDev
			? path.resolve(__dirname, './packages/cedar-os/src')
			: path.resolve(__dirname, './packages/cedar-os/dist');

		// When using source files, handle cedar's internal @/ imports
		if (isDev) {
			// Map @/ imports from cedar to the cedar src directory
			// This handles imports like @/components, @/store, @/utils etc.
			config.resolve.alias['@'] = path.resolve(
				__dirname,
				'./packages/cedar-os/src'
			);
		}

		return config;
	},

	async rewrites() {
		return [
			{
				source: '/ingest/static/:path*',
				destination: 'https://us-assets.i.posthog.com/static/:path*',
			},
			{
				source: '/ingest/:path*',
				destination: 'https://us.i.posthog.com/:path*',
			},
			{
				source: '/ingest/decide',
				destination: 'https://us.i.posthog.com/decide',
			},
		];
	},
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
};

export default nextConfig;
