import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/tmapi": {
        target: "https://app.ticketmaster.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tmapi/, ""),
      },
    },
  },
});
