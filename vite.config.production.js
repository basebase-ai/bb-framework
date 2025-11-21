import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Production build config - bundles ONLY the framework (not /app code)
export default defineConfig({
  plugins: [
    react({
      include: /\.(jsx|js|tsx|ts)$/,
    }),
  ],

  // Build from root (where index.html is located)
  root: './',

  // Production build settings
  build: {
    outDir: './dist',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      
      output: {
        entryFileNames: 'assets/framework-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Optimize for production
    minify: 'esbuild',
    sourcemap: false, // Enable for debugging if needed
    target: 'es2020',
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },

  // Module resolution
  resolve: {
    alias: {
      '@framework': resolve(__dirname, './framework'),
      '@config': resolve(__dirname, './config'),
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      '@mantine/core',
      '@mantine/notifications',
      '@mantine/hooks',
    ],
  },

  // Server config (not used in production, but good for preview)
  server: {
    port: 3000,
  },

  preview: {
    port: 8080,
  },
});

