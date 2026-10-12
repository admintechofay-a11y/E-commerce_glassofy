import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const spaFallbackPlugin = () => ({
  name: 'spa-fallback-generator',
  closeBundle() {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtml = path.resolve(distDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      // 1. Generate 404.html for universal SPA fallback
      fs.copyFileSync(indexHtml, path.resolve(distDir, '404.html'));

      // 2. Generate subroute index.html copies for instant 200 HTTP status on Vercel
      const routes = [
        'products',
        'cart',
        'checkout',
        'login',
        'register',
        'profile',
        'contact',
        'about',
        'terms',
        'privacy',
        'shipping',
        'returns',
      ];
      routes.forEach((route) => {
        const routeDir = path.resolve(distDir, route);
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }
        fs.copyFileSync(indexHtml, path.resolve(routeDir, 'index.html'));
        fs.copyFileSync(indexHtml, path.resolve(distDir, `${route}.html`));
      });
    }
  },
});

export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/images': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
