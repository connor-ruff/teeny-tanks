import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Proxy Socket.IO to the game server in dev so the client can use io()
    // (a relative URL) in both development and production.
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    // Split Phaser into its own chunk so it caches independently from game code.
    // Phaser is ~1.4 MB and rarely changes — players download it once.
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
