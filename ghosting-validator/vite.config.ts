// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ghosting_validator/', // <-- Add this line
  plugins: [react()],
});