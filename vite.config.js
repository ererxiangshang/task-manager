import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 前端源码放在 client/ 目录，构建产物输出到 client/dist
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
