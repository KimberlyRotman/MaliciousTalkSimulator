import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file build so dist/index.html can be opened directly from disk (file://).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
});
