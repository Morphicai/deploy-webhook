import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,  // 使用标准 Vite 端口
    // 注意：测试模式下不使用 proxy，直接通过 VITE_API_BASE_URL 调用后端
    // proxy 仅在开发模式需要时使用
  }
})
