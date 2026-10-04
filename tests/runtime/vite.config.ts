import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

const displayDeps = path.resolve(__dirname, '../../apps/display/node_modules');

export default defineConfig({
  plugins: [viteReact()],
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      '@display': path.resolve(__dirname, '../../apps/display/src'),
      'react': path.resolve(displayDeps, 'react'),
      'react-dom': path.resolve(displayDeps, 'react-dom'),
      'three': path.resolve(displayDeps, 'three'),
      '@react-three/fiber': path.resolve(displayDeps, '@react-three/fiber'),
      '@react-three/drei': path.resolve(displayDeps, '@react-three/drei'),
      'postprocessing': path.resolve(displayDeps, 'postprocessing'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
  },
});
