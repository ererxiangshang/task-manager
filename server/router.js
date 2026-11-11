import { Router } from 'express'
import { sendError } from './http.js'
import * as service from './tasks-service.js'

const router = Router()

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

// 健康检查：顺带告诉前端/学生当前连的是哪个数据库
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const { mode, modeText } = service.storageInfo()
    res.json({ ok: true, storage: mode, storageText: modeText })
  })
)

// 查询任务列表：GET /api/tasks?priority=高
router.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    const tasks = await service.listTasks({ priority: req.query.priority })
    res.json({ tasks })
  })
)

// 新增任务：POST /api/tasks  { title, priority }
router.post(
  '/tasks',
  asyncHandler(async (req, res) => {
    const task = await service.createTask(req.body ?? {})
    res.status(201).json({ task })
  })
)

// 切换完成状态：PATCH /api/tasks/:id  { completed }
router.patch(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const task = await service.updateTask(req.params.id, req.body ?? {})
    res.json({ task })
  })
)

// 删除任务：DELETE /api/tasks/:id
router.delete(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const result = await service.deleteTask(req.params.id)
    res.json(result)
  })
)

// 兜底错误处理
router.use((error, req, res, next) => {
  sendError(res, error)
})

export default router
