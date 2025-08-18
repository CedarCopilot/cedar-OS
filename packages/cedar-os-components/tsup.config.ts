import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  external: [
    'react', 
    'react-dom', 
    'cedar-os',
    '@radix-ui/react-slot',
    'class-variance-authority',
    'diff',
    'framer-motion',
    'lucide-react',
    'motion/react',
    'motion-plus-react', 
    'react-markdown',
    'remark-gfm',
    'uuid',
    /^cedar-os/,
    /\.css$/,
    /@\//,  // External all @/ alias imports
  ],
  outDir: 'dist',
  clean: true,
  noExternal: [],
  esbuildOptions(options) {
    // Skip TypeScript checking for problematic files
    options.ignoreAnnotations = true;
    options.external = options.external || [];
    // Force cedar-os to be external
    if (Array.isArray(options.external)) {
      options.external.push('cedar-os');
    }
  },
  onSuccess: async () => {
    // Copy CSS files to dist
    console.log('Build completed successfully');
  },
});