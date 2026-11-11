import { HttpError } from './errors.js'

/**
 * 兼容 Vercel 与本地 Express：拿到 JSON 请求体
 */
export function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      const parsed = JSON.parse(req.body)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      throw new HttpError(400, '请求体不是合法的 JSON')
    }
  }
  return {}
}

export function sendError(res, error) {
  const status = error instanceof HttpError ? error.status : 500
  const message = error instanceof HttpError ? error.message : '服务器内部错误，请查看日志'
  if (!(error instanceof HttpError)) {
    console.error('[task-manager] 未预期错误：', error)
  }
  res.status(status).json({ error: message })
}

export function methodNotAllowed(res, allow) {
  res.setHeader('Allow', allow.join(', '))
  res.status(405).json({ error: `不支持的请求方法，仅支持 ${allow.join(' / ')}` })
}
