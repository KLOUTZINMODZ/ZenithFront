import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Otimização de Performance: Remove console.log em produção
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  esbuild: {
    // Remove console.log em produção usando esbuild (já incluído no Vite)
    drop: ['console', 'debugger'],
  },
  build: {
    minify: 'esbuild', // Usar esbuild ao invés de terser (mais rápido e já incluído)
    sourcemap: false, // Desabilitar sourcemaps em produção para reduzir tamanho
    // Otimizações adicionais
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
});
