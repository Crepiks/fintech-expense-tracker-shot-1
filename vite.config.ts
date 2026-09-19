import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx only mounts React; behavior is exercised through App in tests.
      exclude: ['src/main.tsx'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { perFile: true, lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
