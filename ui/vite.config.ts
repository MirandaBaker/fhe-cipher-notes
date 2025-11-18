import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'wagmi-vendor': ['wagmi', '@wagmi/core', '@wagmi/connectors'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'crypto-vendor': ['ethers', '@zama-fhe/relayer-sdk'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  define: {
    global: 'globalThis',
  },
})

