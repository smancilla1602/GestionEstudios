import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'"
].join('; ');

/**
 * Inyecta la política de seguridad de contenido únicamente en el build de
 * producción (en desarrollo Vite necesita scripts inline para el HMR).
 */
function inyectarCsp() {
  return {
    name: 'estudios-medicos-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend'
        }
      ];
    }
  };
}

/**
 * Inyecta el inicializador de tema como script clásico (se ejecuta antes del
 * primer renderizado). Vive en `public/` para que Vite no lo transforme.
 */
function inyectarInicializadorTema() {
  return {
    name: 'estudios-medicos-tema',
    order: 'post',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { src: './theme-init.js' },
          injectTo: 'head'
        }
      ];
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), inyectarCsp(), inyectarInicializadorTema()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500
  }
});
