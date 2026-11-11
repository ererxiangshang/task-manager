import { methodNotAllowed, readJsonBody, sendError } from '../server/http.js'
import * as service from '../server/tasks-service.js'

/**
 * Vercel Serverless Function
 * GET  /api/tasks        → 查询任务列表（可选 ?priority=高/中/低）
 * POST /api/tasks        → 新增任务 { title, priority }
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const priority = req.query?.priority
      const tasks = await service.listTasks({ priority })
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ tasks })
    }

    if (req.method === 'POST') {
      const body = readJsonBody(req)
      const task = await service.createTask(body)
      return res.status(201).json({ task })
    }

    return methodNotAllowed(res, ['GET', 'POST'])
  } catch (error) {
    return sendError(res, error)
  }
}
