import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

export default defineConfig(({ mode }) => {
  // Load only variables prefixed with VITE_ into `env`
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  console.log('Loaded VITE env:', env)

  return {
    // Because you're on a root domain (ogonjo.com), base is '/'
    base: '/',

    server: {
      host: '::',
      port: 8082,
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },

    // No manual `define` block needed—Vite exposes all VITE_ vars automatically.
  }
})
