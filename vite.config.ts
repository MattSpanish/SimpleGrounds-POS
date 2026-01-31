import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use BASE_URL env var for GitHub Pages subpath; defaults to '/'
  base: process.env.BASE_URL ?? '/',
  plugins: [react()],
})
