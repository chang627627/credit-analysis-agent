import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No backend: this is a pure front-end prototype. The "agent" and its "tools"
// are mocked in src/agent/*. See README.md for the architecture tour.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
