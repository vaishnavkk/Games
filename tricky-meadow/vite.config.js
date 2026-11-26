import { defineConfig } from 'vite';

function stripRootRedirect() {
  return {
    name: 'strip-root-redirect',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(/\s*<script data-root-redirect>[\s\S]*?<\/script>/, '');
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [stripRootRedirect()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
