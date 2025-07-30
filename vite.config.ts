import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Allows IPv6 and IPv4
    port: 8082, // Match the port from your error
    proxy: {
      '/api/xai': {
        target: 'https://api.x.ai/v1/grok/enhance',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xai/, ''),
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "pdfjs-dist/build/pdf.worker.entry",
    ],
  },
}));