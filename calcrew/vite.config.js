import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    host: true, // allows access from network
    allowedHosts: [
      '4cbc-2a09-bac1-5b40-28-00-31-19b.ngrok-free.app', // ✅ your ngrok URL
    ],
  },
})