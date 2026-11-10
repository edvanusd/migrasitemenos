import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths so the build works both at a domain root
  // (qwenwork.page) and under a sub-path (GitHub Pages /migrasitemenos/).
  base: "./",
  plugins: [react()],
  server: {
    allowedHosts: [".muleusercontent.com"],
  },
  build: {
    emptyOutDir: true,
    outDir: "dist",
    // three.js lives in its own lazily loaded chunk (~540 kB, ~140 kB gzip)
    chunkSizeWarningLimit: 700,
  },
});
