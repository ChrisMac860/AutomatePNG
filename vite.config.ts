import { defineConfig } from "vite";

export default defineConfig({
  root: "demo",
  build: {
    emptyOutDir: true,
    outDir: "../demo-dist"
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  }
});
