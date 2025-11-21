import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js}",
    }),
  ],
  root: resolve(__dirname, "framework"),
  publicDir: false,
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  esbuild: {
    include: /\.(jsx?|tsx?)$/,
    loader: "jsx",
  },
  resolve: {
    alias: {
      "/app": resolve(__dirname, "app"),
      "/framework": resolve(__dirname, "framework"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
    include: ["react", "react-dom", "firebase/app", "firebase/firestore", "firebase/auth", "zustand", "@mantine/core", "@mantine/hooks", "@mantine/notifications"],
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    sourcemap: true,
  },
});

