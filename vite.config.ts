import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  console.log('Loaded env variables:', env); // Debug log

  return {
    server: {
      host: "::",
      port: 8082,
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
      include: [],
    },
    base: mode === "production" ? "/ogonjo.com/" : "/", // Ensure this matches your deployment subpath
    build: {
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        output: {
          // Ensure chunk file names are consistent
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
    define: {
      'import.meta.env.VITE_XAI_API_KEY': JSON.stringify(env.VITE_XAI_API_KEY),
    },
  };
});