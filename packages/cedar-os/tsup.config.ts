import { defineConfig } from 'tsup';

export default defineConfig({
	target: 'es2020',
	format: ['cjs', 'esm'],
	// entry: {
	// 	index: './src/index.ts',
	// 	store: './src/store/CedarStore.ts', // Separate store bundle
	// },
	splitting: false,
	sourcemap: true,
	clean: true,
	dts: true,
});
