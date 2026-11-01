/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/TaxAssistant/',
  // api/ is a separate Azure Functions package with its own tests.
  test: { include: ['src/**/*.test.ts'] },
})
