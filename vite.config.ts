import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Die Datendateien sind der mit Abstand größte Brocken. Ein eigener Chunk
    // hält den App-Code klein und cachebar, wenn sich nur Code ändert.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Verse zuerst prüfen: Sie liegen unter src/data, ändern sich aber
          // unabhängig von den Ereignisdaten (eigenes Skript, andere Quelle)
          // und bleiben so für sich cachebar.
          if (id.includes('/src/data/verses/')) return 'verse';
          if (id.includes('/src/data/')) return 'daten';
          if (id.includes('node_modules/leaflet')) return 'leaflet';
          if (id.includes('node_modules/d3-')) return 'd3';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
