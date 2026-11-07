import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {iptvProxyPlugin} from './vite-plugins/iptv-proxy';
import {legacyCssPlugin} from './vite-plugins/legacy-css';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), iptvProxyPlugin(), legacyCssPlugin()],
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
