import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves this project at https://qourts.github.io/EchelonPickleballCup/
// so production assets must resolve under that repository sub-path.
const PRODUCTION_BASE = '/EchelonPickleballCup/'

export default defineConfig(({ command, isPreview }) => ({
  // `vite preview` serves the production build, so it needs the production base as well.
  base: command === 'build' || isPreview ? PRODUCTION_BASE : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'reference-api/**/*.test.ts'],
  },
}))
