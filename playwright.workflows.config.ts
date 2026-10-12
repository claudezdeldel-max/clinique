import { defineConfig } from '@playwright/test'
import path from 'node:path'

export default defineConfig({
  testDir: './tests/workflows', timeout: 45000, workers: 1, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5181', headless: true,
    launchOptions: { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node server/index.js', url: 'http://127.0.0.1:3011/api/health', reuseExistingServer: false,
      env: { NODE_ENV: 'test', PORT: '3011', DB_PATH: path.resolve('scratch/workflow-test.db'), UPLOADS_PATH: path.resolve('scratch/workflow-test-uploads') } },
    { command: 'npx vite --host 127.0.0.1 --port 5181 --strictPort', url: 'http://127.0.0.1:5181', reuseExistingServer: false,
      env: { VITE_API_TARGET: 'http://127.0.0.1:3011' } },
  ],
})
