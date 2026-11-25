import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base:'./',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
      watch: {
        ignored: [
          '**/.tmp/**',
          '**/screenshots/**',
          '**/.npm-cache/**',
          '**/.edge-profile/**',
          '**/.*.tmpdir/**',
        ],
      },
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            const normalized = id.replaceAll('\\', '/')
            if (normalized.includes('element-plus')) return 'element-plus'
            if (
              normalized.includes('/vue/') ||
              normalized.includes('/@vue/') ||
              normalized.includes('vue-router') ||
              normalized.includes('pinia')
            ) {
              return 'vue-vendor'
            }
            return 'vendor'
          },
        },
      },
    },
  }
})
