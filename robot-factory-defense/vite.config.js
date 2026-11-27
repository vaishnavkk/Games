import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function serveAndSyncDist() {
  return {
    name: 'serve-and-sync-dist',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/app.html';
        }
        next();
      });
    },
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const appHtml = path.join(distDir, 'app.html');
      const distIndex = path.join(distDir, 'index.html');
      if (fs.existsSync(appHtml)) {
        fs.renameSync(appHtml, distIndex);
      }
      if (fs.existsSync(distIndex)) {
        fs.copyFileSync(distIndex, path.resolve(__dirname, 'index.html'));
        const distAssets = path.join(distDir, 'assets');
        const rootAssets = path.resolve(__dirname, 'assets');
        fs.rmSync(rootAssets, { recursive: true, force: true });
        if (fs.existsSync(distAssets)) {
          fs.cpSync(distAssets, rootAssets, { recursive: true });
        }
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [serveAndSyncDist()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'app.html')
    }
  },
  server: {
    port: 3000
  }
});
