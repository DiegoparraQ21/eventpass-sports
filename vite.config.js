import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/n8n': {
          target: env.VITE_N8N_PROXY_TARGET,
          changeOrigin: true,
          secure: true,
          headers: { 'ngrok-skip-browser-warning': 'true' },
          rewrite: (path) => path.replace(/^\/n8n/, ''),
        },
      },
    },
  };
});
