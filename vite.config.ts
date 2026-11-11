import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {iptvProxyPlugin} from './vite-plugins/iptv-proxy';

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss(), iptvProxyPlugin()],
    // Production bundle: no console noise or debugger statements (they also cost time on TV sticks).
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
