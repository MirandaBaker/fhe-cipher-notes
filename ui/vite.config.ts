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
  // 移除 server.headers，让浏览器使用默认设置
  define: {
    global: 'globalThis',
  },
})

