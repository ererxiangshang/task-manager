import { methodNotAllowed, readJsonBody, sendError } from '../../server/http.js'
import * as service from '../../server/tasks-service.js'

/**
 * Vercel Serverless Function
 * PATCH  /api/tasks/:id  → 切换完成状态 { completed: true/false }
 * DELETE /api/tasks/:id  → 删除任务
 */
export default async function handler(req, res) {
  try {
    const id = req.query?.id

    if (req.method === 'PATCH') {
      const body = readJsonBody(req)
      const task = await service.updateTask(id, body)
      return res.status(200).json({ task })
    }

    if (req.method === 'DELETE') {
      const result = await service.deleteTask(id)
      return res.status(200).json(result)
    }

    return methodNotAllowed(res, ['PATCH', 'DELETE'])
  } catch (error) {
    return sendError(res, error)
  }
}
