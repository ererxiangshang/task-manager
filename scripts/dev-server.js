import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import 'dotenv/config'
import apiRouter from '../server/router.js'
import { storageInfo } from '../server/tasks-service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || (isProd ? 3000 : 5173)

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use('/api', apiRouter)

if (isProd) {
  // 生产模式：直接托管 Vite 构建产物
  const distDir = path.join(rootDir, 'client', 'dist')
  app.use(express.static(distDir))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  // 开发模式：把 Vite 作为中间件挂在同一个端口上，修改前端代码即时生效
  const { createServer } = await import('vite')
  const vite = await createServer({
    configFile: path.join(rootDir, 'vite.config.js'),
    server: { middlewareMode: true },
    appType: 'custom'
  })

  app.use(vite.middlewares)
  app.use('*', async (req, res, next) => {
    try {
      const fs = await import('node:fs/promises')
      let template = await fs.readFile(path.join(rootDir, 'client', 'index.html'), 'utf8')
      template = await vite.transformIndexHtml(req.originalUrl, template)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template)
    } catch (error) {
      vite.ssrFixStacktrace(error)
      next(error)
    }
  })
}

app.listen(port, () => {
  const { modeText } = storageInfo()
  console.log('')
  console.log('  智能任务管理系统已启动')
  console.log(`  访问地址：http://localhost:${port}`)
  console.log(`  数据存储：${modeText}`)
  console.log('')
})
