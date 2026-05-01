import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  define: {
    // Injected at build time from package.json — works in both dev and packaged app
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? ''),
  },
});
