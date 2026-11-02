import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { registerRoutes } from '../server/proxyRoutes.js';

export function iptvProxyPlugin(): Plugin {
  return {
    name: 'zendit-iptv-proxy',
    configureServer(server: ViteDevServer) {
      registerRoutes(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      registerRoutes(server.middlewares);
    },
  };
}
