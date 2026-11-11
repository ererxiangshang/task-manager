/**
 * 统一的业务异常：带 HTTP 状态码，便于接口层直接返回中文错误信息
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}
